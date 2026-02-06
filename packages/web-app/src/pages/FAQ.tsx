import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone } from "lucide-react";

const FAQ = () => {
  const faqCategories = [
    {
      title: "General Questions",
      questions: [
        {
          question: "What is your platform and how does it work?",
          answer: "Our platform is a suite of AI-powered productivity tools designed specifically for legal and professional services. We integrate seamlessly with your existing workflows to automate document processing, enhance collaboration, and significantly reduce manual work."
        },
        {
          question: "Who is this platform designed for?",
          answer: "Our tools are designed for law firms, legal departments, consultants, and professional services teams who work extensively with documents and want to reclaim their personal time by working more efficiently."
        },
        {
          question: "How quickly can I get started?",
          answer: "You can start using our platform immediately with our 30-day free trial. Most users are productive within their first day, with full workflow integration typically completed within a week."
        },
        {
          question: "Do you offer training and onboarding?",
          answer: "Yes! We provide comprehensive onboarding for all users, including video tutorials, documentation, and personalized training sessions for Enterprise customers."
        }
      ]
    },
    {
      title: "ThinkDoc",
      questions: [
        {
          question: "Which versions of Microsoft Word are supported?",
          answer: "Our ThinkDoc supports Microsoft Word 2016 and later, including Word for Office 365, Word 2019, Word 2021, and Word for Mac. Both desktop and web versions are supported."
        },
        {
          question: "How do I install ThinkDoc?",
          answer: "Installation is simple - download the add-in from our platform, run the installer, and it will automatically integrate with your Word application. Detailed installation guides are provided for all supported platforms."
        },
        {
          question: "Can I use the add-in offline?",
          answer: "The add-in requires an internet connection for AI-powered features and document processing. However, basic functionality and previously processed content remain accessible offline."
        },
        {
          question: "Is my document data secure within the add-in?",
          answer: "Absolutely. All data is encrypted in transit and at rest. We're SOC 2 Type II certified and ISO 27001 compliant. Your documents never leave our secure infrastructure without your explicit permission."
        }
      ]
    },
    {
      title: "Document Automation",
      questions: [
        {
          question: "What types of documents can be automated?",
          answer: "Our platform can automate contracts, legal briefs, compliance documents, reports, proposals, and virtually any text-based document with structured content. We support Word, PDF, and plain text formats."
        },
        {
          question: "How accurate is the document processing?",
          answer: "Our AI achieves 95%+ accuracy on most document types. The system learns from your corrections and improves over time. All processed content is reviewed before final output."
        },
        {
          question: "Can I customize templates and automation rules?",
          answer: "Yes! You can create custom templates, set automation rules, and train the AI on your specific document formats and preferences. Enterprise customers get dedicated template customization support."
        },
        {
          question: "How long does document processing take?",
          answer: "Most documents are processed within seconds to minutes, depending on length and complexity. Large batch processing jobs are handled asynchronously with progress notifications."
        }
      ]
    },
    {
      title: "Security & Compliance",
      questions: [
        {
          question: "What security certifications do you have?",
          answer: "We maintain SOC 2 Type II certification, ISO 27001 compliance, and are GDPR ready. Our infrastructure is hosted on AWS with bank-level security measures."
        },
        {
          question: "Where is my data stored?",
          answer: "Data is stored in secure, geographically distributed data centers with your choice of data residency. We offer data location controls for compliance with local regulations."
        },
        {
          question: "Can I delete my data?",
          answer: "Yes, you have full control over your data. You can delete individual documents, export all data, or request complete account deletion at any time through your account settings."
        },
        {
          question: "Do you have access to my documents?",
          answer: "Our staff does not have access to your documents unless you explicitly grant permission for support purposes. All access is logged and audited."
        },
        {
          question: "Are you HIPAA compliant?",
          answer: "Yes, we can provide HIPAA compliance for healthcare clients. This includes signing Business Associate Agreements (BAA) and implementing additional security controls as needed."
        }
      ]
    },
    {
      title: "Integrations",
      questions: [
        {
          question: "Which platforms do you integrate with?",
          answer: "We integrate with Microsoft Office 365, Google Workspace, Salesforce, NetDocuments, iManage, Dropbox, Box, and many other popular business platforms. Custom integrations are available for Enterprise customers."
        },
        {
          question: "How do integrations work?",
          answer: "Our integrations use secure APIs to connect with your existing tools. Data flows seamlessly between platforms while maintaining security and audit trails."
        },
        {
          question: "Can you build custom integrations?",
          answer: "Yes! Enterprise customers can request custom integrations with their existing systems. Our technical team will work with you to design and implement the integration."
        },
        {
          question: "Do integrations affect performance?",
          answer: "No, our integrations are designed to be lightweight and efficient. They run in the background without impacting the performance of your existing applications."
        }
      ]
    },
    {
      title: "Pricing & Billing",
      questions: [
        {
          question: "What's included in the free trial?",
          answer: "The 30-day free trial includes full access to all Essentials plan features with no limitations. No credit card required to start."
        },
        {
          question: "Can I change my plan anytime?",
          answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated accordingly."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards, ACH transfers, and wire transfers. Enterprise customers can also be invoiced with net 30 terms."
        },
        {
          question: "Is there a setup fee?",
          answer: "No setup fees for Essentials plans. Enterprise customers may have implementation fees depending on customization requirements, which are discussed during the sales process."
        },
        {
          question: "Can I get a refund?",
          answer: "We offer a 30-day money-back guarantee for annual subscriptions. Monthly subscriptions can be canceled anytime with no penalty."
        }
      ]
    },
    {
      title: "Technical Support",
      questions: [
        {
          question: "What support options are available?",
          answer: "Essentials customers get email support with 24-hour response times. Enterprise customers receive priority support with dedicated success managers and 24/7 phone support."
        },
        {
          question: "Do you provide implementation assistance?",
          answer: "Yes! We provide implementation guidance for all customers, with hands-on assistance available for Enterprise plans. This includes workflow analysis and optimization recommendations."
        },
        {
          question: "What if I need help with setup?",
          answer: "Our support team provides comprehensive setup assistance, including screen-sharing sessions, configuration help, and user training to ensure you get the most value from our platform."
        },
        {
          question: "Do you offer API documentation?",
          answer: "Yes, comprehensive API documentation is available for developers and IT teams who want to build custom integrations or automate workflows programmatically."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-foreground mb-6 leading-tight">
                Frequently Asked Questions
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                Find answers to common questions about our platform, features, and how we can help you work more efficiently.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto">
              {faqCategories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-light text-foreground mb-8 pb-4 border-b border-border">
                    {category.title}
                  </h2>
                  
                  <Accordion type="single" collapsible className="space-y-4">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`${categoryIndex}-${faqIndex}`}
                        className="bg-muted rounded-lg px-6"
                      >
                        <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-6">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground font-light leading-relaxed pb-6">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section className="py-20 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-4xl font-light text-foreground mb-6">
                  Still Have Questions?
                </h2>
                <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed">
                  Our support team is here to help you get the most out of our platform.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="text-center">
                  <CardHeader>
                    <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-xl font-light">Email Support</CardTitle>
                    <CardDescription>Send us a detailed message</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      asChild
                      variant="outline" 
                      className="w-full border-2 border-foreground text-foreground hover:bg-foreground hover:text-background rounded-full"
                    >
                      <a href="mailto:support@mythinkspace.ai">Send Email</a>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-xl font-light">Phone Support</CardTitle>
                    <CardDescription>Enterprise customers only</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full border-2 border-foreground text-foreground hover:bg-foreground hover:text-background rounded-full">
                      Contact Sales
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-xl md:text-2xl font-light text-foreground mb-8">
                Popular Resources
              </h3>
              
              <div className="grid md:grid-cols-4 gap-4">
                <Button variant="outline" className="rounded-full border-2 border-border hover:border-primary hover:text-primary">
                  Getting Started Guide
                </Button>
                <Button variant="outline" className="rounded-full border-2 border-border hover:border-primary hover:text-primary">
                  API Documentation
                </Button>
                <Button variant="outline" className="rounded-full border-2 border-border hover:border-primary hover:text-primary">
                  Security Center
                </Button>
                <Button variant="outline" className="rounded-full border-2 border-border hover:border-primary hover:text-primary">
                  Video Tutorials
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;