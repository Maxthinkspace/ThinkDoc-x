/**
 * Jurisdiction Configuration
 * 
 * Defines jurisdiction-specific legal requirements and rules for redomiciling documents.
 * Each jurisdiction has requirements that must be included, removed, or adapted when
 * transforming documents from one jurisdiction to another.
 */

export interface JurisdictionRequirement {
  clauseType: string;
  description: string;
  required: boolean;
  example?: string;
  notes?: string;
}

export interface JurisdictionConfig {
  name: string;
  legalSystem: 'common law' | 'civil law' | 'mixed';
  requirements: JurisdictionRequirement[];
  commonClauses: string[];
  prohibitedClauses?: string[];
}

export const jurisdictionConfigs: Record<string, JurisdictionConfig> = {
  'China': {
    name: 'China',
    legalSystem: 'civil law',
    requirements: [
      {
        clauseType: 'social_insurance',
        description: 'Social insurance contributions (pension, medical, unemployment, work injury, maternity)',
        required: true,
        example: 'The Company shall contribute to social insurance in accordance with PRC law.',
      },
      {
        clauseType: 'housing_fund',
        description: 'Housing provident fund contributions',
        required: true,
        example: 'The Company shall contribute to the housing provident fund as required by law.',
      },
      {
        clauseType: 'labor_contract',
        description: 'Fixed-term or open-ended employment contracts',
        required: true,
      },
      {
        clauseType: 'probation_period',
        description: 'Maximum probation period limits',
        required: true,
        notes: 'Maximum 6 months probation period',
      },
    ],
    commonClauses: [
      'Labor contract termination procedures',
      'Severance pay calculations',
      'Non-compete restrictions (with compensation)',
      'Confidentiality obligations',
    ],
    prohibitedClauses: [
      'At-will employment',
      'Waiver of statutory rights',
    ],
  },

  'Singapore': {
    name: 'Singapore',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'cpf',
        description: 'Central Provident Fund (CPF) contributions',
        required: true,
        example: 'The Company shall make CPF contributions in accordance with the Central Provident Fund Act.',
      },
      {
        clauseType: 'employment_act',
        description: 'Compliance with Employment Act requirements',
        required: true,
        notes: 'Applies to employees earning less than S$4,500/month',
      },
      {
        clauseType: 'notice_period',
        description: 'Statutory notice periods for termination',
        required: true,
        example: 'Either party may terminate this agreement by giving [X] weeks notice in writing.',
      },
      {
        clauseType: 'levy',
        description: 'Foreign worker levy (if applicable)',
        required: false,
        notes: 'Only for foreign workers',
      },
    ],
    commonClauses: [
      'Annual leave entitlement (minimum 7 days)',
      'Sick leave entitlement',
      'Public holiday entitlements',
      'Non-compete restrictions (reasonable scope)',
      'Confidentiality and non-disclosure',
    ],
    prohibitedClauses: [
      'Waiver of statutory leave entitlements',
      'Unreasonable non-compete restrictions',
    ],
  },

  'Hong Kong': {
    name: 'Hong Kong',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'mpf',
        description: 'Mandatory Provident Fund (MPF) contributions',
        required: true,
        example: 'The Company shall make MPF contributions as required by the Mandatory Provident Fund Schemes Ordinance.',
      },
      {
        clauseType: 'employment_ordinance',
        description: 'Compliance with Employment Ordinance',
        required: true,
      },
      {
        clauseType: 'statutory_holidays',
        description: '12 statutory holidays per year',
        required: true,
      },
      {
        clauseType: 'annual_leave',
        description: 'Statutory annual leave entitlement',
        required: true,
        notes: 'Minimum 7 days for first year, increases with service',
      },
    ],
    commonClauses: [
      'Notice periods for termination',
      'Severance pay and long service pay',
      'Rest days (one per week)',
      'Non-compete restrictions',
    ],
  },

  'United States (Delaware)': {
    name: 'United States (Delaware)',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'at_will',
        description: 'At-will employment (unless otherwise specified)',
        required: false,
        example: 'This employment relationship is at-will and may be terminated by either party at any time.',
      },
      {
        clauseType: 'state_law',
        description: 'Delaware state law compliance',
        required: true,
      },
      {
        clauseType: 'non_compete',
        description: 'Non-compete restrictions (enforceable if reasonable)',
        required: false,
        notes: 'Must be reasonable in scope, duration, and geography',
      },
    ],
    commonClauses: [
      'Confidentiality and non-disclosure',
      'Intellectual property assignment',
      'Arbitration clauses',
      'Choice of law and venue',
    ],
    prohibitedClauses: [
      'Waiver of jury trial (in some contexts)',
      'Unreasonable non-compete restrictions',
    ],
  },

  'United States (New York)': {
    name: 'United States (New York)',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'at_will',
        description: 'At-will employment (unless otherwise specified)',
        required: false,
        example: 'This employment relationship is at-will and may be terminated by either party at any time.',
      },
      {
        clauseType: 'state_law',
        description: 'New York state law compliance',
        required: true,
      },
      {
        clauseType: 'non_compete',
        description: 'Non-compete restrictions (recently restricted)',
        required: false,
        notes: 'New York has restrictions on non-compete clauses',
      },
    ],
    commonClauses: [
      'Confidentiality and non-disclosure',
      'Intellectual property assignment',
      'Arbitration clauses',
      'Choice of law and venue',
    ],
    prohibitedClauses: [
      'Broad non-compete restrictions',
      'Waiver of statutory rights',
    ],
  },

  'England and Wales': {
    name: 'England and Wales',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'pension_auto_enrollment',
        description: 'Automatic pension enrollment',
        required: true,
        example: 'The Company shall enroll the Employee in a qualifying pension scheme in accordance with the Pensions Act 2008.',
      },
      {
        clauseType: 'statutory_notice',
        description: 'Statutory notice periods',
        required: true,
        notes: 'Minimum 1 week after 1 month of service',
      },
      {
        clauseType: 'working_time',
        description: 'Working Time Regulations compliance',
        required: true,
        notes: '48-hour average working week limit',
      },
    ],
    commonClauses: [
      'Annual leave entitlement (minimum 5.6 weeks)',
      'Sick pay entitlements',
      'Maternity/paternity leave',
      'Non-compete restrictions (must be reasonable)',
      'Confidentiality obligations',
    ],
    prohibitedClauses: [
      'Waiver of statutory rights',
      'Unreasonable non-compete restrictions',
    ],
  },

  'Australia': {
    name: 'Australia',
    legalSystem: 'common law',
    requirements: [
      {
        clauseType: 'superannuation',
        description: 'Superannuation contributions',
        required: true,
        example: 'The Company shall make superannuation contributions in accordance with the Superannuation Guarantee (Administration) Act 1992.',
      },
      {
        clauseType: 'fair_work',
        description: 'Fair Work Act compliance',
        required: true,
      },
      {
        clauseType: 'national_employment_standards',
        description: 'National Employment Standards (NES)',
        required: true,
        notes: 'Minimum entitlements including leave, notice, etc.',
      },
    ],
    commonClauses: [
      'Annual leave entitlement (minimum 4 weeks)',
      'Personal/carer\'s leave',
      'Long service leave',
      'Public holidays',
      'Non-compete restrictions',
    ],
    prohibitedClauses: [
      'Waiver of NES entitlements',
      'Unlawful termination provisions',
    ],
  },
};

/**
 * Get jurisdiction-specific requirements for a document type
 */
export function getJurisdictionRequirements(
  jurisdiction: string,
  documentType: string
): JurisdictionRequirement[] {
  const config = jurisdictionConfigs[jurisdiction];
  if (!config) {
    return [];
  }

  // Filter requirements based on document type
  if (documentType === 'employment') {
    return config.requirements.filter(req => 
      req.clauseType.includes('employment') ||
      req.clauseType.includes('cpf') ||
      req.clauseType.includes('mpf') ||
      req.clauseType.includes('superannuation') ||
      req.clauseType.includes('social_insurance') ||
      req.clauseType.includes('pension') ||
      req.clauseType.includes('notice') ||
      req.clauseType.includes('leave')
    );
  }

  return config.requirements;
}

/**
 * Get clauses that should be removed when moving from source to target jurisdiction
 */
export function getClausesToRemove(
  sourceJurisdiction: string,
  targetJurisdiction: string
): string[] {
  const sourceConfig = jurisdictionConfigs[sourceJurisdiction];
  const targetConfig = jurisdictionConfigs[targetJurisdiction];

  if (!sourceConfig || !targetConfig) {
    return [];
  }

  const toRemove: string[] = [];

  // Remove clauses prohibited in target jurisdiction
  if (targetConfig.prohibitedClauses) {
    toRemove.push(...targetConfig.prohibitedClauses);
  }

  // Remove source-specific clauses that don't apply to target
  if (sourceJurisdiction === 'China') {
    toRemove.push('Social insurance contributions', 'Housing provident fund');
  } else if (sourceJurisdiction === 'Singapore') {
    toRemove.push('CPF contributions');
  } else if (sourceJurisdiction === 'Hong Kong') {
    toRemove.push('MPF contributions');
  } else if (sourceJurisdiction.includes('United States')) {
    toRemove.push('At-will employment');
  }

  return toRemove;
}

/**
 * Get clauses that should be added for target jurisdiction
 */
export function getClausesToAdd(
  targetJurisdiction: string,
  documentType: string
): JurisdictionRequirement[] {
  return getJurisdictionRequirements(targetJurisdiction, documentType);
}

