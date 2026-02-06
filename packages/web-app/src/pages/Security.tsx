import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Users, FileCheck, Award } from "lucide-react";

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-light text-foreground mb-6 leading-tight">
                Security You Can Trust
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto font-light">
                Your data is protected by enterprise-grade security measures and international compliance standards.
              </p>
            </div>
          </div>
        </section>

        {/* ISO 27001 Section */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-8">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl md:text-5xl font-light text-foreground mb-8">
                  ISO 27001 Certified
                </h2>
                <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">
                  We maintain the highest international standards for information security management systems
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-background rounded-lg p-8 text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
                  <h3 className="text-xl font-light text-foreground mb-4">Information Security</h3>
                  <p className="text-muted-foreground font-light">
                    Systematic approach to managing sensitive company information so that it remains secure
                  </p>
                </div>

                <div className="bg-background rounded-lg p-8 text-center">
                  <Lock className="h-12 w-12 text-primary mx-auto mb-6" />
                  <h3 className="text-xl font-light text-foreground mb-4">Risk Management</h3>
                  <p className="text-muted-foreground font-light">
                    Continuous risk assessment and mitigation strategies to protect your data
                  </p>
                </div>

                <div className="bg-background rounded-lg p-8 text-center">
                  <FileCheck className="h-12 w-12 text-primary mx-auto mb-6" />
                  <h3 className="text-xl font-light text-foreground mb-4">Compliance Framework</h3>
                  <p className="text-muted-foreground font-light">
                    Regular audits and continuous improvement of our security processes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Features */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-3xl md:text-5xl font-light text-foreground mb-8">
                  Comprehensive Protection
                </h2>
                <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">
                  Multiple layers of security to ensure your data remains private and protected
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-2xl font-light text-foreground mb-6">Data Encryption</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">256-bit AES encryption for data at rest</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">TLS 1.3 encryption for data in transit</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">End-to-end encryption for sensitive communications</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-light text-foreground mb-6">Access Control</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Multi-factor authentication (MFA)</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Role-based access control (RBAC)</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Single Sign-On (SSO) integration</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-light text-foreground mb-6">Infrastructure Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">AWS-powered infrastructure with SOC 2 compliance</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Regular security audits and penetration testing</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">24/7 security monitoring and incident response</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-light text-foreground mb-6">Privacy & Compliance</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">GDPR and CCPA compliant data handling</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Data residency controls and geographical restrictions</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary rounded-full mt-3 mr-4 flex-shrink-0"></div>
                      <p className="text-muted-foreground font-light">Right to data portability and deletion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-12">
                Trusted Certifications
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-background rounded-lg p-8">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-light text-foreground mb-2">ISO 27001</h3>
                  <p className="text-sm text-muted-foreground font-light">Information Security Management</p>
                </div>
                
                <div className="bg-background rounded-lg p-8">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-light text-foreground mb-2">SOC 2 Type II</h3>
                  <p className="text-sm text-muted-foreground font-light">Service Organization Control</p>
                </div>
                
                <div className="bg-background rounded-lg p-8">
                  <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-light text-foreground mb-2">GDPR Ready</h3>
                  <p className="text-sm text-muted-foreground font-light">European Privacy Regulation</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6">
                Security Questions?
              </h2>
              
              <p className="text-lg text-muted-foreground font-light mb-8 max-w-2xl mx-auto">
                Our security team is here to answer any questions about our compliance and security measures.
              </p>
              
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground px-10 py-3 text-lg rounded-full transition-smooth">
                Contact Security Team
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Security;