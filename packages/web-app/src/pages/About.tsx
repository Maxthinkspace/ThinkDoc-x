import Header from "@/components/Header";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section id="about" className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-light text-foreground mb-16 tracking-tight">
                The Operating System for Knowledge Work
              </h2>
              
              <div className="space-y-12 text-left">
                <div className="space-y-6">
                  <p className="text-xl text-foreground font-light leading-relaxed">
                    Just as operating systems transformed how we interact with computers, ThinkSpace 
                    transforms how professionals interact with knowledge.
                  </p>
                  
                  <p className="text-xl text-muted-foreground font-light leading-relaxed">
                    We're building the foundational layer that powers modern knowledge work—where 
                    documents, data, and decisions flow seamlessly, and intelligence is embedded 
                    at every layer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What We Built Section */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-16">
                A Complete Platform for Professional Work
              </h2>
              
              <div className="space-y-8 text-left">
                <p className="text-xl text-muted-foreground font-light leading-relaxed">
                  Traditional tools are fragmented. You use one system for documents, another for 
                  collaboration, another for analysis. Each lives in its own silo, forcing you to 
                  constantly context-switch and manually transfer information.
                </p>
                
                <p className="text-xl text-foreground font-light leading-relaxed">
                  ThinkSpace unifies everything. It's the layer that sits beneath your work—managing 
                  your documents, understanding your processes, learning your patterns, and connecting 
                  all the pieces intelligently.
                </p>

                <div className="py-8 border-l-4 border-primary pl-8">
                  <p className="text-2xl text-foreground font-light leading-relaxed">
                    "An operating system doesn't just run programs—it orchestrates everything. 
                    That's what ThinkSpace does for knowledge work."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Components Section */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-16">
                Built on Core Principles
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12 text-left">
                <div className="space-y-4">
                  <h3 className="text-2xl font-light text-foreground">Intelligence by Default</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Every document, every workflow, every interaction is enhanced by AI—not as an 
                    add-on, but as a fundamental capability woven into the fabric of the system.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-light text-foreground">Unified Data Layer</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Your knowledge lives in one place. No more searching across systems, no more 
                    version conflicts. One source of truth, accessible everywhere you work.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-light text-foreground">Workflow Orchestration</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Complex processes become simple. The system understands your workflows and 
                    automates the routine, freeing you to focus on decisions that matter.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-light text-foreground">Security & Control</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Enterprise-grade security isn't bolted on—it's architectural. Your data stays 
                    in your environment, under your control, always.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-32 bg-muted">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-16">
                Why It Matters
              </h2>
              
              <div className="space-y-8 text-left">
                <p className="text-xl text-foreground font-light leading-relaxed">
                  Knowledge workers spend 60% of their time on routine tasks—searching for documents, 
                  formatting reports, copying data between systems. That's not work. That's overhead.
                </p>
                
                <p className="text-xl text-muted-foreground font-light leading-relaxed">
                  An operating system handles the overhead so applications can focus on their purpose. 
                  ThinkSpace does the same for you. It handles the routine so you can focus on thinking, 
                  creating, and solving meaningful problems.
                </p>

                <div className="text-center py-8">
                  <p className="text-2xl text-primary font-light italic">
                    "We don't replace knowledge workers. We amplify them."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-16">
                The Platform in Numbers
              </h2>
              
              <div className="grid md:grid-cols-3 gap-12">
                <div>
                  <div className="text-4xl font-light text-primary mb-4">85%</div>
                  <div className="text-muted-foreground font-light">Reduction in routine tasks</div>
                </div>
                <div>
                  <div className="text-4xl font-light text-primary mb-4">10M+</div>
                  <div className="text-muted-foreground font-light">Documents processed</div>
                </div>
                <div>
                  <div className="text-4xl font-light text-primary mb-4">500+</div>
                  <div className="text-muted-foreground font-light">Teams powered</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;

