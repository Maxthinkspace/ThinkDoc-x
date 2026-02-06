import { logger } from '@/config/logger';
import { db } from '@/config/database';
import { batchAnalysisJobs, batchAnalysisResults, vaultFiles } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { updateJobProgress, setJobResult, setJobError } from '@/utils/jobStore';
import { parseDocument, type ParsedDocumentResult } from '@/services/vault/documentParser';
import { getFileFromStorage } from '@/services/storage';
import { analyzeDefinitions } from '@/controllers/definition-checker';
import { runReviewWithPlaybooksWorkflow } from '@/controllers/contract-review';
import type { ParsedDocument } from '@/services/vault/structureParser';

const MAX_CONCURRENT = 5;

export interface BatchAnalysisOptions {
  playbookId?: string;
  language?: 'english' | 'chinese';
}

export interface DocumentAnalysisResult {
  fileId: string;
  fileName: string;
  status: 'completed' | 'failed';
  results?: any;
  issues?: Array<{
    severity: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    section?: string;
  }>;
  riskScore?: number;
  error?: string;
}

export interface AggregatedResults {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalIssues: number;
  issuesBySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  averageRiskScore: number;
  documentsWithMostIssues: Array<{
    fileId: string;
    fileName: string;
    issueCount: number;
  }>;
  crossDocumentIssues?: Array<{
    type: string;
    description: string;
    affectedFiles: string[];
  }>;
  perDocumentResults: DocumentAnalysisResult[];
}

export async function runBatchAnalysisWorkflow(
  jobId: string,
  batchJobId: string,
  projectId: string,
  fileIds: string[],
  analysisType: string,
  options: BatchAnalysisOptions
): Promise<AggregatedResults> {
  logger.info({
    jobId,
    batchJobId,
    projectId,
    fileCount: fileIds.length,
    analysisType,
  }, 'Batch Analysis: Starting workflow');

  // Update batch job status
  await db
    .update(batchAnalysisJobs)
    .set({ status: 'processing' })
    .where(eq(batchAnalysisJobs.id, batchJobId));

  // Load files from vault
  const files = await db
    .select()
    .from(vaultFiles)
    .where(and(
      eq(vaultFiles.projectId, projectId),
      inArray(vaultFiles.id, fileIds)
    ));

  if (files.length === 0) {
    throw new Error('No files found');
  }

  logger.info({ fileCount: files.length }, 'Batch Analysis: Files loaded');

  const results: DocumentAnalysisResult[] = [];
  let processedCount = 0;

  // Process files in batches
  for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
    const batch = files.slice(i, i + MAX_CONCURRENT);
    
    const batchPromises = batch.map(async (file) => {
      try {
        updateJobProgress(jobId, processedCount, files.length, `Processing ${file.name}...`);

        // Get file from storage
        const fileBuffer = await getFileFromStorage(file.storagePath || '');
        if (!fileBuffer) {
          throw new Error(`File not found in storage: ${file.storagePath}`);
        }

        // Parse document
        const parsedDocResult: ParsedDocumentResult = await parseDocument(
          fileBuffer,
          file.name,
          file.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        
        const parsedDoc = parsedDocResult.structure ? {
          structure: parsedDocResult.structure.sections || [],
          recitals: parsedDocResult.structure.recitals || '',
          signatures: parsedDocResult.structure.signatures || '',
          appendices: parsedDocResult.structure.appendices || '',
          badFormatSections: parsedDocResult.structure.badFormatSections || [],
        } : {
          structure: [],
          recitals: '',
          signatures: '',
          appendices: '',
          badFormatSections: [],
        };

        // Run analysis based on type
        let analysisResult: any;
        let issues: Array<{ severity: 'high' | 'medium' | 'low'; category: string; description: string; section?: string }> = [];
        let riskScore = 0;

        switch (analysisType) {
          case 'definition-check':
            const defResult = await analyzeDefinitions(
              parsedDoc as ParsedDocument,
              options.language || 'english'
            );
            analysisResult = defResult;
            // Convert definition issues to standard format
            if (defResult.unusedDefinitions) {
              issues.push(...defResult.unusedDefinitions.map(d => ({
                severity: 'low' as const,
                category: 'Unused Definition',
                description: `Definition "${d.term}" is defined but never used`,
              })));
            }
            if (defResult.undefinedTerms) {
              issues.push(...defResult.undefinedTerms.map(t => ({
                severity: 'medium' as const,
                category: 'Undefined Term',
                description: `Term "${t.term}" is used but not defined`,
              })));
            }
            if (defResult.inconsistentTerms) {
              issues.push(...defResult.inconsistentTerms.map(t => ({
                severity: 'high' as const,
                category: 'Inconsistent Term',
                description: `Term "${t.term}" has inconsistent capitalization`,
              })));
            }
            break;

          case 'contract-review':
            if (!options.playbookId) {
              throw new Error('Playbook ID required for contract review');
            }
            // TODO: Load playbook and run review
            // For now, return placeholder
            analysisResult = { message: 'Contract review not yet implemented' };
            break;

          case 'risk-analysis':
            // TODO: Implement risk analysis
            analysisResult = { message: 'Risk analysis not yet implemented' };
            break;

          case 'cross-document':
            // Cross-document analysis happens after all documents are processed
            analysisResult = { message: 'Cross-document analysis pending' };
            break;

          default:
            throw new Error(`Unknown analysis type: ${analysisType}`);
        }

        // Calculate risk score (simplified)
        riskScore = issues.reduce((score, issue) => {
          if (issue.severity === 'high') return score + 10;
          if (issue.severity === 'medium') return score + 5;
          return score + 1;
        }, 0);

        const result: DocumentAnalysisResult = {
          fileId: file.id,
          fileName: file.name,
          status: 'completed',
          results: analysisResult,
          issues,
          riskScore: Math.min(100, riskScore),
        };

        // Save per-document result
        await db.insert(batchAnalysisResults).values({
          jobId: batchJobId,
          fileId: file.id,
          analysisType,
          results: analysisResult,
          issues,
          riskScore,
          status: 'completed',
        });

        processedCount++;
        return result;
      } catch (error) {
        logger.error({ error, fileId: file.id, fileName: file.name }, 'Batch Analysis: Failed to process file');
        
        const errorResult: DocumentAnalysisResult = {
          fileId: file.id,
          fileName: file.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        // Save error result
        await db.insert(batchAnalysisResults).values({
          jobId: batchJobId,
          fileId: file.id,
          analysisType,
          results: null,
          status: 'failed',
          error: errorResult.error,
        });

        processedCount++;
        return errorResult;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  // Run cross-document analysis if requested
  if (analysisType === 'cross-document') {
    updateJobProgress(jobId, files.length, files.length + 1, 'Analyzing cross-document consistency...');
    
    // Collect all parsed documents for cross-document comparison
    const parsedDocuments: Array<{ fileId: string; fileName: string; parsedDoc: ParsedDocument }> = [];
    
    for (const result of results) {
      if (result.status === 'completed' && result.results) {
        // Re-parse if needed, or use cached parsed data
        // For now, we'll do a simplified cross-document check
      }
    }
    
    // Cross-document consistency checks will be done in aggregateResults
  }

  // Aggregate results
  const aggregated = aggregateResults(results, analysisType, files);

  // Update batch job with results
  await db
    .update(batchAnalysisJobs)
    .set({
      status: 'completed',
      progress: files.length,
      results: aggregated,
      completedAt: new Date(),
    })
    .where(eq(batchAnalysisJobs.id, batchJobId));

  logger.info({ batchJobId, completedFiles: results.filter(r => r.status === 'completed').length }, 'Batch Analysis: Workflow completed');

  return aggregated;
}

function aggregateResults(
  results: DocumentAnalysisResult[],
  analysisType: string,
  files: Array<{ id: string; name: string }>
): AggregatedResults {
  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed');

  // Aggregate issues
  const allIssues = completed.flatMap(r => r.issues || []);
  const issuesBySeverity = {
    high: allIssues.filter(i => i.severity === 'high').length,
    medium: allIssues.filter(i => i.severity === 'medium').length,
    low: allIssues.filter(i => i.severity === 'low').length,
  };

  // Calculate average risk score
  const riskScores = completed.map(r => r.riskScore || 0);
  const averageRiskScore = riskScores.length > 0
    ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length)
    : 0;

  // Find documents with most issues
  const documentsWithMostIssues = completed
    .map(r => ({
      fileId: r.fileId,
      fileName: r.fileName,
      issueCount: r.issues?.length || 0,
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 10);

  // Cross-document consistency checks
  const crossDocumentIssues: Array<{ type: string; description: string; affectedFiles: string[] }> = [];
  
  if (analysisType === 'cross-document' || analysisType === 'definition-check') {
    // Check for inconsistent defined terms across documents
    const termDefinitions = new Map<string, Set<string>>();
    
    completed.forEach(result => {
      if (result.results?.definedTerms) {
        result.results.definedTerms.forEach((term: string) => {
          if (!termDefinitions.has(term)) {
            termDefinitions.set(term, new Set());
          }
          termDefinitions.get(term)!.add(result.fileName);
        });
      }
    });

    // Find terms defined differently across documents
    termDefinitions.forEach((files, term) => {
      if (files.size > 1) {
        crossDocumentIssues.push({
          type: 'Inconsistent Definition',
          description: `Term "${term}" is defined in multiple documents`,
          affectedFiles: Array.from(files),
        });
      }
    });
  }

  return {
    totalFiles: results.length,
    completedFiles: completed.length,
    failedFiles: failed.length,
    totalIssues: allIssues.length,
    issuesBySeverity,
    averageRiskScore,
    documentsWithMostIssues,
    crossDocumentIssues: crossDocumentIssues.length > 0 ? crossDocumentIssues : undefined,
    perDocumentResults: results,
  };
}

