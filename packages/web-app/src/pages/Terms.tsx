import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-foreground mb-6 leading-tight">
                Terms and Conditions
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-light leading-relaxed">
                These terms govern your use of our platform and services. Please read them carefully.
              </p>
              <p className="text-sm text-muted-foreground font-light">
                Last updated: December 10, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto prose prose-lg">
              
              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">1. Acceptance of Terms</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>By accessing or using ThinkSpace's services, you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use our services.</p>
                  <p>These Terms constitute a legally binding agreement between you and ThinkSpace. We may update these Terms from time to time, and your continued use of our services constitutes acceptance of any changes.</p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">2. Description of Service</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>ThinkSpace provides AI-powered productivity tools including:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Microsoft ThinkDoc for document processing and automation</li>
                    <li>Document automation and intelligent analysis tools</li>
                    <li>Team collaboration features and workflow management</li>
                    <li>Integration capabilities with third-party applications</li>
                    <li>Cloud-based storage and processing services</li>
                  </ul>
                  <p>We reserve the right to modify, suspend, or discontinue any aspect of our services at any time with reasonable notice.</p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">3. User Accounts and Registration</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Account Creation</h3>
                    <p>To use our services, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Account Responsibility</h3>
                    <p>You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Eligibility</h3>
                    <p>You must be at least 18 years old and have the legal capacity to enter into contracts in your jurisdiction to use our services.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">4. Acceptable Use Policy</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>You agree not to use our services to:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Violate any applicable laws, regulations, or third-party rights</li>
                    <li>Upload, store, or process illegal, harmful, or offensive content</li>
                    <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                    <li>Interfere with or disrupt our services or servers</li>
                    <li>Use our services for any commercial purpose without authorization</li>
                    <li>Reverse engineer, decompile, or create derivative works of our software</li>
                    <li>Share your account credentials with unauthorized parties</li>
                    <li>Use our services to spam, phish, or engage in other malicious activities</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">5. Subscription and Payment Terms</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Subscription Plans</h3>
                    <p>We offer various subscription plans with different features and pricing. Current pricing is available on our website and may change with reasonable notice.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Payment</h3>
                    <p>Subscription fees are billed in advance on a monthly or annual basis. You authorize us to charge your payment method for all applicable fees. All fees are non-refundable unless otherwise specified.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Free Trial</h3>
                    <p>We may offer free trials for new users. Trial periods and terms are specified at signup. Your subscription will automatically begin after the trial period unless you cancel.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Cancellation</h3>
                    <p>You may cancel your subscription at any time through your account settings. Cancellations take effect at the end of your current billing period.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">6. Intellectual Property Rights</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Our IP Rights</h3>
                    <p>ThinkSpace and its services, including software, designs, text, graphics, and trademarks, are owned by us or our licensors and protected by intellectual property laws.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Your Content</h3>
                    <p>You retain ownership of any content you upload or create using our services. By using our services, you grant us a limited license to process, store, and transmit your content as necessary to provide our services.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">License to Use</h3>
                    <p>We grant you a limited, non-exclusive, non-transferable license to use our services in accordance with these Terms during your subscription period.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">7. Privacy and Data Protection</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using our services, you consent to our privacy practices as described in our Privacy Policy.</p>
                  <p>We implement industry-standard security measures to protect your data, but no method of transmission over the internet is 100% secure. You use our services at your own risk.</p>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">8. Disclaimers and Limitations of Liability</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Service Availability</h3>
                    <p>We strive to provide reliable services but cannot guarantee 100% uptime. Our services are provided "as is" without warranties of any kind, express or implied.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Limitation of Liability</h3>
                    <p>To the maximum extent permitted by law, ThinkSpace shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Maximum Liability</h3>
                    <p>Our total liability to you for any claims arising from or related to these Terms or our services shall not exceed the amount paid by you for our services in the 12 months preceding the claim.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">9. Indemnification</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <p>You agree to indemnify and hold ThinkSpace harmless from any claims, damages, losses, or expenses (including attorney fees) arising from:</p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Your use of our services in violation of these Terms</li>
                    <li>Your content or any third-party claims related to your content</li>
                    <li>Your violation of any third-party rights</li>
                    <li>Any breach of your representations or warranties in these Terms</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">10. Termination</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Termination by You</h3>
                    <p>You may terminate your account at any time by following the cancellation process in your account settings.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Termination by Us</h3>
                    <p>We may suspend or terminate your access to our services immediately if you violate these Terms or for any other reason at our discretion, with or without notice.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Effect of Termination</h3>
                    <p>Upon termination, your right to use our services will cease immediately. We may delete your data after a reasonable period, subject to our Privacy Policy and legal obligations.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">11. Governing Law and Dispute Resolution</h2>
                <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Governing Law</h3>
                    <p>These Terms are governed by and construed in accordance with the laws of Singapore, without regard to conflict of law principles.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-3">Dispute Resolution</h3>
                    <p>Any disputes arising under these Terms will be resolved through binding arbitration, except for claims that may be brought in small claims court.</p>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-light text-foreground mb-6">12. General Provisions</h2>
                <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                  <ul className="list-disc ml-6 space-y-2">
                    <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and ThinkSpace regarding our services.</li>
                    <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
                    <li><strong>Waiver:</strong> No waiver of any term or condition will be deemed a further or continuing waiver of such term or any other term.</li>
                    <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our prior written consent.</li>
                    <li><strong>Force Majeure:</strong> We are not liable for any failure to perform due to circumstances beyond our reasonable control.</li>
                  </ul>
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
                Questions About These Terms?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground font-light mb-8 max-w-2xl mx-auto leading-relaxed">
                If you have any questions about these terms and conditions, please contact our legal team.
              </p>
              <div className="space-y-4">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base rounded-full transition-all duration-300">
                  Contact Legal Team
                </Button>
                <p className="text-sm text-muted-foreground font-light">
                  Email: legal@mythinkspace.ai • Response within 48 hours
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

export default Terms;