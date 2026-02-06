import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-foreground mb-6 leading-tight">
                Privacy Policy
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-light leading-relaxed">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
              </p>
              <p className="text-sm text-muted-foreground font-light">
                Last updated: December 10, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Content */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto prose prose-lg">
              
              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Information We Collect</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Personal Information</h3>
                    <p>We collect information you provide directly to us, including:</p>
                    <ul className="list-disc ml-6 space-y-2 mt-3">
                      <li>Name, email address, and contact information when you create an account</li>
                      <li>Billing information and payment details for subscription services</li>
                      <li>Communication preferences and support inquiries</li>
                      <li>Professional information such as job title and organization</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Usage Information</h3>
                    <p>We automatically collect information about how you use our services:</p>
                    <ul className="list-disc ml-6 space-y-2 mt-3">
                      <li>Log data including IP address, browser type, and operating system</li>
                      <li>Device information and unique identifiers</li>
                      <li>Usage patterns, feature interactions, and performance data</li>
                      <li>Document metadata (but not document content unless explicitly authorized)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">How We Use Your Information</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices, updates, and security alerts</li>
                    <li>Respond to your comments and questions</li>
                    <li>Analyze usage trends and optimize user experience</li>
                    <li>Detect, prevent, and address fraud or security issues</li>
                    <li>Comply with legal obligations and enforce our terms</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Information Sharing</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <p>We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:</p>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Service Providers</h3>
                    <p>We may share information with trusted third-party service providers who assist us in operating our platform, processing payments, or analyzing data. These providers are bound by confidentiality agreements and can only use your information for the specific services they provide to us.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Legal Requirements</h3>
                    <p>We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety, or that of our users.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Business Transfers</h3>
                    <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. We will notify you of any such change in ownership.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Data Security</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>We implement industry-standard security measures to protect your information:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>256-bit AES encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Multi-factor authentication and access controls</li>
                    <li>SOC 2 Type II and ISO 27001 compliance</li>
                    <li>24/7 security monitoring and incident response</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Your Rights</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <p>Depending on your location, you may have the following rights regarding your personal information:</p>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Access and Portability</h3>
                    <p>You can request a copy of the personal information we hold about you and receive it in a structured, commonly used format.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Correction and Updates</h3>
                    <p>You can update your personal information through your account settings or by contacting us directly.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Deletion</h3>
                    <p>You can request that we delete your personal information, subject to certain legal and contractual limitations.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Objection and Restriction</h3>
                    <p>You can object to certain processing of your information or request that we restrict how we use it.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Cookies and Tracking</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Remember your preferences and settings</li>
                    <li>Analyze site traffic and usage patterns</li>
                    <li>Improve our services and user experience</li>
                    <li>Provide personalized content and features</li>
                  </ul>
                  <p className="mt-4">You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our services.</p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Data Retention</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>We retain your information for as long as necessary to:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Provide our services to you</li>
                    <li>Comply with legal obligations</li>
                    <li>Resolve disputes and enforce our agreements</li>
                    <li>Improve our services and prevent fraud</li>
                  </ul>
                  <p className="mt-4">When you delete your account, we will delete your personal information within 30 days, except where retention is required by law or legitimate business interests.</p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">International Transfers</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure that such transfers comply with applicable data protection laws through:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Standard contractual clauses approved by regulatory authorities</li>
                    <li>Adequacy decisions by relevant data protection authorities</li>
                    <li>Other lawful transfer mechanisms as appropriate</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">Changes to This Policy</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>We may update this privacy policy from time to time. When we make changes, we will:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Update the "Last updated" date at the top of this policy</li>
                    <li>Notify you of significant changes via email or through our platform</li>
                    <li>Provide a clear summary of the changes made</li>
                  </ul>
                  <p className="mt-4">Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl md:text-4xl font-light text-foreground mb-6">
                Questions About Privacy?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground font-light mb-8 max-w-2xl mx-auto leading-relaxed">
                If you have any questions about this privacy policy or our data practices, please contact us.
              </p>
              <div className="space-y-4">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base rounded-full transition-all duration-300">
                  Contact Privacy Team
                </Button>
                <p className="text-sm text-muted-foreground font-light">
                  Email: privacy@mythinkspace.ai • Response within 48 hours
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;