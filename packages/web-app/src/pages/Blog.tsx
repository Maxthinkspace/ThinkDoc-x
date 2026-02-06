import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar } from "lucide-react";
import agentDiagram from "@/assets/agent-diagram.svg";

const Blog = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="container max-w-4xl mx-auto px-4 py-16">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Scaling AI Feature Development with Agent Frameworks
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <time>Nov 8, 2025</time>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              ThinkSpace engineers share why we adopted agents and how the shift to an agent framework helped scale feature development and accelerate delivery across our platform.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Agents have solidified from marketing speak to practical engineering systems. At ThinkSpace, our Associate's shift from prompts and bespoke orchestration to a fully agentic system meant big changes for both our codebase and how teams collaborate.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              In this post, we'll cover why we adopted agents and how Tool Bundles and eval gates let us scale in‑thread features alongside the number of engineering teams at ThinkSpace. We'll also share what broke along the way and how this shift to an agent framework ultimately enabled us to scale feature development and accelerate delivery.
            </p>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              Why We Adopted an Agent Framework
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              The Associate team's goal is to proactively plan, create, and execute end‑to‑end tasks on our customers' behalf, using tools from inside and outside of ThinkSpace. Our system integrates core building blocks — retrieval, drafting, and review — into one powerful thread. Depending on the question a user asks, the correct answer might be:
            </p>

            <ul className="list-disc pl-8 mb-6 space-y-3 text-foreground/90">
              <li>Make multiple retrieval requests to specialized databases, then check them against recent news</li>
              <li>Decide to pull in new information from a customer's knowledge base to tackle a tricky section in a long draft</li>
              <li>Add new columns to a document review table and then aggregate over them</li>
            </ul>

            <p className="text-foreground/90 leading-relaxed mb-8">
              This year, our Associate also became the home for critical integrations (like research databases and document management systems) and new product modes (for example, Deep Research). Our goal was to enable other teams to contribute these integrations into Associate, rather than relying on our team to integrate it into a monolithic system.
            </p>
            
            <div className="my-12 rounded-xl overflow-hidden border border-border bg-muted/30 p-8">
              <img src={agentDiagram} alt="Agent Framework Architecture" className="w-full h-auto" />
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Agent framework architecture showing the interaction between system components
              </p>
            </div>

            <p className="text-foreground/90 leading-relaxed mb-8">
              These two problems — open‑ended problem solving and many integrations — are well‑suited to an agent framework because it can cleanly separate capabilities ("adding columns," "editing drafts," "searching databases") from the model's reasoning. Adopting a single agent framework scaled our in‑thread feature development from one team to four, led to emergent feature combinations, and enabled centralized eval. But switching to agents also introduced new collaboration and org‑scaling challenges. We had to design new interfaces and new testing methodologies for those teams to move quickly.
            </p>

            <div className="bg-muted/50 border-l-4 border-primary p-6 my-8 rounded-r-lg">
              <p className="text-lg italic text-foreground/90">
                "The hardest part of adopting agents isn't writing the code — it's learning, as an engineering org, to share ownership of a single brain."
              </p>
            </div>

            <p className="text-foreground/90 leading-relaxed mb-8">
              Throughout this process, one thing became clear: The hardest part of adopting agents isn't writing the code — it's learning, as an engineering org, to share ownership of a single brain.
            </p>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              Pre-Agent Development
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Before agents, the Associate team's AI feature development was straightforward: write Python, mix it with LLMs, run an eval, then ship it. This led to highly tuned systems that enabled us to release benchmark-leading numbers on our internal datasets.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              As we pulled new features into the Associate framework, we routed them with design. Need to draft? Use Draft mode. Need to pull in a knowledge source? Surface knowledge source recommendations. New features that other teams added were limited to retrieval knowledge sources.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              Then we hit a UX, engineering, and collaboration wall. People weren't discovering Draft mode. Integrating multiple retrieval calls behind a single interface was complex to maintain. New features didn't have a clear path to launch.
            </p>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              Early Challenges With Adopting Agents
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              In mid-2025, we decided to shift to a pure agent framework. Forced retrieval calls became tool calls, new integrations became tool calls, and bespoke editing logic became (you guessed it) tool calls, along with a growing system prompt.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              Our first intuition was that collaboration with agents was going to be easy. One team owns the system prompt, one owns the tools. But as we started developing with agents, we realized that each new capability required its own set of directions within the main system prompt. And as soon as multiple engineers modify the system's core instructions, there's the potential to step on each other's toes.
            </p>

            <div className="bg-muted/50 border-l-4 border-primary p-6 my-8 rounded-r-lg">
              <p className="text-lg italic text-foreground/90">
                "You're no longer merging unit-testable code, you're merging English."
              </p>
            </div>

            <p className="text-foreground/90 leading-relaxed mb-8">
              If developer A is focused on improving tool recall for retrieval tools, they might be tempted to tell the system prompt: "Call all the tools at your disposal." However, developer B might be working on reducing the average latency of queries and instruct the system prompt, "Don't overthink things and take the fastest path to the goal." In an orchestrated system, these two engineers work on different parts. But in an agentic system, their goals directly collide. As one of our developers put it, "You're no longer merging unit-testable code, you're merging English."
            </p>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              How We Scaled Agent Development
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              We had three goals with agent development at ThinkSpace:
            </p>

            <ol className="list-decimal pl-8 mb-6 space-y-3 text-foreground/90">
              <li><strong>High quality output that gets better over time:</strong> We wanted to leverage the capabilities of models to their fullest</li>
              <li><strong>Interoperability between new features:</strong> Capabilities, like retrieval or drafting, should naturally work together</li>
              <li><strong>Minimal involvement from a centralized team:</strong> One team shouldn't own adding all new capabilities, or we can't scale feature development</li>
            </ol>

            <p className="text-foreground/90 leading-relaxed mb-6">
              In order to achieve these goals, we adopted three core principles:
            </p>

            <h3 className="text-2xl font-semibold text-foreground mt-10 mb-4">
              1. No Custom Orchestration
            </h3>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Individual product developers at ThinkSpace were used to writing bespoke orchestration to accomplish goals. For example, a research product would deterministically query a user's document, then use the result to investigate relevant information sources.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              While this is always the shorter path to a product goal, it quickly introduces the same web of routing and human decision-making. We decided to adopt an external library instead of writing our own agent library, which forced our team to work with the strengths of the newest generation of models — calling tools in a loop — rather than building hybrid systems.
            </p>

            <h3 className="text-2xl font-semibold text-foreground mt-10 mb-4">
              2. Capabilities are Tool Bundles
            </h3>

            <p className="text-foreground/90 leading-relaxed mb-6">
              An agent at ThinkSpace is composed of a system prompt and a set of Tool Bundles. A Tool Bundle is an interface we designed that allows developers to package together new capabilities, which may be composed of multiple tools or sub-agents, into a single entity.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-8">
              Tool Bundles give feature and integration developers the freedom to inject instructions into the main agent system prompt to achieve their capabilities without needing to make a request of the Associate team. They also enable capabilities to be portable between different agents.
            </p>

            <h3 className="text-2xl font-semibold text-foreground mt-10 mb-4">
              3. Eval Gates on Capabilities
            </h3>

            <p className="text-foreground/90 leading-relaxed mb-6">
              A contribution-based framework leads to three major risks for system performance:
            </p>

            <ul className="list-disc pl-8 mb-6 space-y-3 text-foreground/90">
              <li><strong>System Prompt → Tool Bundle conflicts:</strong> If the reasoning component of the system prompt is updated to push for fast decision-making, the model may drop its recall on specific tools</li>
              <li><strong>Tool Bundle → System Prompt conflicts:</strong> If a Tool Bundle mandates that the model must "always call every tool," the agent will call tools in other bundles</li>
              <li><strong>Context rot:</strong> If the new tool outputs significant context, the agent can suffer from context rot</li>
            </ul>

            <p className="text-foreground/90 leading-relaxed mb-8">
              ThinkSpace guards against this by requiring teams to maintain datasets and evaluators for each of their Tool Bundles, along with thresholds that fire if metrics drop below a certain score.
            </p>

            <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
              Developing Agents With the Right Safeguards
            </h2>

            <p className="text-foreground/90 leading-relaxed mb-6">
              Agents allow you to scale feature development in thread products to the size of your engineering team, but they are a deceptively complex surface to develop. At ThinkSpace, a "no custom orchestration" rule kept behavior centralized, Tool Bundles gave teams a safe contribution model, and eval gates protect quality as our capabilities multiply.
            </p>

            <p className="text-foreground/90 leading-relaxed mb-6">
              ThinkSpace's Engineering team is hard at work building new capabilities, behaviors, and context management into our agents. Here are some other technical challenges we're working on:
            </p>

            <ul className="list-disc pl-8 mb-8 space-y-3 text-foreground/90">
              <li>Deepening our understanding of agents and introducing new best practices around system prompt and tool design</li>
              <li>Scaling our eval gating framework to more capabilities — how do we smartly test for a combinatorial number of Tool Bundles?</li>
              <li>Leveraging reinforcement-fine-tuning to improve tool recall, answer quality, and reduce reliance on prompt engineering</li>
            </ul>

            <p className="text-foreground/90 leading-relaxed">
              If these problems sound interesting to you, we're hiring for roles across the Engineering team.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;