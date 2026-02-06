import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, Shield, Lock, Network, Database, Eye, CheckCircle } from "lucide-react";

const SecurityBlog = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="container max-w-4xl mx-auto px-4 py-16">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Security at ThinkSpace: Your Data, Your Control
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <time>Nov 11, 2024</time>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Protecting client data isn't just a priority—it's the foundation of everything we build. Discover how ThinkSpace's security-first architecture ensures your data never leaves your control.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-6">
              At ThinkSpace, we've taken a radical approach to data security: we don't touch your data. Period. Every piece of information you process through our platform lives exclusively within your own cloud infrastructure. But we go further than that—our entire software stack and infrastructure components are deployed directly into your environment, ensuring complete sovereignty over your data.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              This architectural decision means that all AI models, databases, file storage systems, and processing capabilities operate entirely under your control. Your sensitive information—encrypted both at rest and in transit—never traverses outside your network perimeter. Data flows securely through Microsoft's enterprise backbone or through encrypted tunnels directly to your users' endpoints, maintaining security at every step.
            </p>

            <div className="flex items-start gap-4 bg-primary/5 border border-primary/20 rounded-lg p-6 my-8">
              <Shield className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Zero Trust Architecture</h3>
                <p className="text-foreground/80">
                  We operate on the principles of zero trust and least privileged access. Even within your own environment, access is tightly controlled with need-to-know permissions, rigorous scrutiny, comprehensive logging, and regular security audits.
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
              <Lock className="h-8 w-8 text-primary" />
              Security by Design
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Security isn't an afterthought at ThinkSpace—it's embedded in every line of code we write. From the initial development phase through production deployment, we employ a comprehensive security strategy:
            </p>

            <ul className="list-disc pl-8 mb-8 space-y-3 text-foreground/90">
              <li><strong>Automated End-to-End Testing:</strong> Every feature undergoes rigorous automated testing to catch vulnerabilities before deployment</li>
              <li><strong>Unit and Mutation Testing:</strong> We verify that our code behaves correctly under all conditions, including edge cases</li>
              <li><strong>Continuous Vulnerability Scanning:</strong> Every stage of development includes automated security scans to identify and remediate potential threats</li>
              <li><strong>Code Review and Audit Trails:</strong> All changes are reviewed and logged, creating accountability and transparency</li>
            </ul>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
              <Network className="h-8 w-8 text-primary" />
              Enterprise-Grade Network Security
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Our network architecture demonstrates our commitment to isolation and security. When you examine our infrastructure, you'll notice that every endpoint—from AI model services to database connections and storage containers—is dedicated exclusively to your organization.
            </p>

            <div className="bg-muted/50 border-l-4 border-primary p-6 my-8 rounded-r-lg">
              <p className="text-lg text-foreground/90">
                Data transmission occurs exclusively through the Microsoft backbone network, completely bypassing the public internet and eliminating exposure to common network-based threats.
              </p>
            </div>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Our virtual network architecture implements sophisticated segmentation:
            </p>

            <ul className="list-disc pl-8 mb-8 space-y-3 text-foreground/90">
              <li><strong>Subnet Isolation:</strong> Networks are divided into isolated subnets with strict inter-subnet communication controls</li>
              <li><strong>Port-Level Security:</strong> Only essential ports are accessible between network segments, following the principle of least privilege</li>
              <li><strong>Minimal External Exposure:</strong> Only the web application interface is internet-facing, and even that can be secured further</li>
              <li><strong>Zero Trust Access:</strong> For enhanced security, client access can be routed through Twingate, a modern zero-trust network solution that provides peer-to-peer encrypted connections—far superior to traditional VPN technology</li>
              <li><strong>IP Whitelisting:</strong> Access can be restricted to specific IP addresses or ranges for maximum control</li>
            </ul>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6 flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              AI Model Privacy and Data Protection
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              When it comes to AI model training and inference, your data privacy is absolute. At ThinkSpace, we maintain the highest standards of data confidentiality for all your prompts, completions, embeddings, and training datasets.
            </p>

            <div className="grid gap-4 my-8">
              <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Customer Data Isolation</h4>
                  <p className="text-sm text-muted-foreground">Your data remains exclusively yours—never shared with or exposed to other customers</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Third-Party Access Prevention</h4>
                  <p className="text-sm text-muted-foreground">OpenAI and other AI providers have zero access to your data—it stays within your infrastructure</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">No External Model Training</h4>
                  <p className="text-sm text-muted-foreground">Your data does not contribute to improving OpenAI, Microsoft, or any third-party AI models</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Stateless AI Models</h4>
                  <p className="text-sm text-muted-foreground">Models are entirely stateless unless you explicitly choose to fine-tune them with your training data</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-background border border-border rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Exclusive Fine-Tuned Models</h4>
                  <p className="text-sm text-muted-foreground">If you create fine-tuned models, they remain exclusively for your use—your proprietary insights stay under your control</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 my-12">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                <Eye className="h-7 w-7 text-primary" />
                Complete Transparency
              </h3>
              <p className="text-foreground/90 leading-relaxed mb-4">
                We believe security requires transparency. That's why we're committed to providing full visibility into our security practices, infrastructure design, and data handling procedures.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                Your organization maintains complete audit trails, logging capabilities, and monitoring tools to verify that your data security policies are being enforced at all times.
              </p>
            </div>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              Security as a Partnership
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              At ThinkSpace, we don't view security as a feature—it's a partnership with our clients. By deploying our entire infrastructure within your environment, we ensure that you maintain complete control while we provide cutting-edge AI capabilities.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              This approach allows you to leverage powerful AI technologies while meeting the strictest regulatory requirements, whether you're in healthcare, finance, legal, or any other highly regulated industry.
            </p>

            <div className="bg-muted/50 border-l-4 border-primary p-6 my-8 rounded-r-lg">
              <p className="text-lg italic text-foreground/90">
                "Security isn't about building walls—it's about ensuring your data never needs to leave your castle in the first place."
              </p>
            </div>

            <p className="text-foreground/90 leading-relaxed">
              Have questions about our security architecture or want to discuss how ThinkSpace can meet your organization's specific security requirements? Our security team is here to help you understand every aspect of how we protect your data.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default SecurityBlog;
