import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Resources = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Security at ThinkSpace: Your Data, Your Control",
      description: "Discover how ThinkSpace's security-first architecture ensures your data never leaves your control. Learn about our zero-trust approach, network isolation, and AI model privacy guarantees.",
      date: "Nov 11, 2024",
      link: "/security-blog",
      category: "Security"
    },
    {
      id: 2,
      title: "Scaling AI Feature Development with Agent Frameworks",
      description: "ThinkSpace engineers share why we adopted agents and how the shift to an agent framework helped scale feature development and accelerate delivery across our platform.",
      date: "Nov 8, 2025",
      link: "/blog",
      category: "Engineering"
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Resources
            </h1>
            <p className="text-xl text-muted-foreground">
              Insights, updates, and best practices from the ThinkSpace team
            </p>
          </div>

          {/* Blog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Link key={post.id} to={post.link} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        <time>{post.date}</time>
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-3">
                      {post.description}
                    </CardDescription>
                    <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                      Read More
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Resources;
