import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Check, FileText, Boxes, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  const plans = [
    {
      name: "ThinkDoc",
      price: "$499",
      period: "per user/month",
      description: "AI-powered document intelligence for teams",
      features: [
        "Unlimited document processing",
        "Playbook generation & review",
        "Review with precedents",
        "Redline summarization",
        "Microsoft Word Add-in included",
        "Standard integrations (iManage, SharePoint)",
        "100GB secure storage",
        "Email & chat support",
        "99.5% uptime SLA"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "ThinkStudio",
      price: "Custom",
      period: "pricing", 
      description: "Local-first AI platform for enterprises",
      features: [
        "Local LLM deployment",
        "Custom Knowledge Base",
        "AI Agent builder",
        "AI Assistant integration",
        "Enterprise connectors",
        "On-premise deployment options",
        "Custom integrations & API access",
        "SSO & advanced security (ISO 27001)",
        "Dedicated success manager",
        "24/7 priority phone support"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const productDetails = [
    {
      icon: FileText,
      name: "ThinkDoc",
      tagline: "Document Intelligence",
      description: "Transform how you work with documents. Parse, analyze, and extract insights from any document type with AI-powered accuracy.",
      features: [
        "High-accuracy document parsing",
        "Playbook generation & review",
        "Precedent-based review",
        "Redline summarization",
        "Microsoft Word Add-in"
      ],
      link: "/products/thinkdoc"
    },
    {
      icon: Boxes,
      name: "ThinkStudio",
      tagline: "AI Platform",
      description: "Build your custom AI workflows with our modular platform. Local LLM, Knowledge Base, AI Agents, and enterprise connectors.",
      features: [
        "Local LLM deployment",
        "Custom Knowledge Base",
        "AI Agent builder",
        "AI Assistant integration",
        "Enterprise connectors"
      ],
      link: "/products/thinkstudio"
    }
  ];

  const faqs = [
    {
      question: "What's included in the free trial?",
      answer: "Full access to ThinkDoc and ThinkStudio Professional features for 14 days. No credit card required."
    },
    {
      question: "Can I use ThinkDoc or ThinkStudio separately?",
      answer: "Yes, both products work independently. Contact us for individual product pricing."
    },
    {
      question: "How does on-premise deployment work?",
      answer: "Enterprise plans include on-premise options for ThinkStudio, keeping your data and models entirely under your control."
    },
    {
      question: "What about data security?",
      answer: "ISO 27001 compliant with role-based access control. Your data is encrypted at rest and in transit. We never train models on your data."
    },
    {
      question: "Which integrations are supported?",
      answer: "Professional includes iManage, SharePoint, and Google Drive. Enterprise adds custom integrations with any system."
    },
    {
      question: "What kind of support do you provide?",
      answer: "Professional: Email & chat. Enterprise: 24/7 phone support with dedicated success manager and custom SLAs."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="py-24 md:py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-xl md:text-2xl font-serif text-foreground">Pricing</span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  Simple & Transparent
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-8 leading-tight">
                Invest in your team's productivity
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Choose the plan that transforms how your team works with documents and knowledge. 
                Every minute saved is a minute that matters.
              </p>

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {plans.map((plan, index) => (
                  <div 
                    key={index} 
                    className={`bg-background rounded-2xl border p-8 transition-all hover:shadow-lg ${
                      plan.popular ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border/50'
                    }`}
                  >
                    {plan.popular && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                        <span>Most Popular</span>
                      </div>
                    )}
                    
                    <div className="mb-8">
                      <h3 className="text-2xl font-serif text-foreground mb-4">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-serif text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground text-base ml-2">/ {plan.period}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link to="/demo">
                      <Button 
                        className={`w-full rounded-lg py-3 ${
                          plan.popular 
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                            : ''
                        }`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products Overview */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-serif text-foreground mb-4">
                  Two Products, One Platform
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  Everything you need to transform document workflows and build custom AI solutions
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {productDetails.map((product, index) => (
                  <div 
                    key={index}
                    className="bg-background rounded-2xl border border-border/50 p-8 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <product.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif text-foreground">{product.name}</h3>
                        <p className="text-sm text-primary">{product.tagline}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {product.description}
                    </p>
                    <div className="space-y-3 mb-8">
                      {product.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Link to={product.link}>
                      <Button variant="outline" className="w-full rounded-lg py-3">
                        Learn More
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-serif text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  {faqs.map((faqItem, index) => (
                    <div 
                      key={index}
                      className="bg-background rounded-xl border border-border/50 p-6 hover:shadow-md transition-all"
                    >
                      <h3 className="text-lg font-medium text-foreground mb-3">{faqItem.question}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">{faqItem.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Ready to transform your workflow?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                See ThinkSpace in action with a personalized demo.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/demo">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 py-3 text-base">
                    Book a Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/demo">
                  <Button variant="outline" className="rounded-lg px-8 py-3 text-base">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Pricing;

