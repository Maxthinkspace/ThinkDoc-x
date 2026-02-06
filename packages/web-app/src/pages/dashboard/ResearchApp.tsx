import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Globe, BookOpen, Building2, Newspaper, 
  Gavel, Filter, MapPin, FileText, TrendingUp 
} from "lucide-react";

const ResearchApp = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

  const jurisdictions = [
    { name: "Singapore", count: "25,000+ docs" },
    { name: "United States", count: "1.2M+ docs" },
    { name: "United Kingdom", count: "850K+ docs" },
    { name: "European Union", count: "950K+ docs" },
    { name: "Australia", count: "420K+ docs" },
    { name: "Hong Kong", count: "180K+ docs" },
  ];

  const lawTypes = [
    "Corporate Law", "Securities", "Banking & Finance", "Employment",
    "Intellectual Property", "Tax", "Real Estate", "Litigation"
  ];

  const singaporeSources = [
    {
      name: "Singapore Academy of Law",
      type: "Primary Source",
      docs: "15,000+",
      updated: "Daily",
      icon: BookOpen
    },
    {
      name: "Singapore Statutes Online",
      type: "Government",
      docs: "8,500+",
      updated: "Real-time",
      icon: FileText
    },
    {
      name: "Singapore Law Watch",
      type: "Case Law",
      docs: "45,000+",
      updated: "Daily",
      icon: Gavel
    },
    {
      name: "ACRA Business Filings",
      type: "Corporate Registry",
      docs: "1.2M+",
      updated: "Real-time",
      icon: Building2
    }
  ];

  const lawFirmReports = [
    {
      firm: "Allen & Gledhill",
      title: "2024 Singapore M&A Review",
      date: "15 Nov 2025",
      category: "Corporate"
    },
    {
      firm: "Rajah & Tann",
      title: "Fintech Regulatory Update Q4",
      date: "12 Nov 2025",
      category: "Banking & Finance"
    },
    {
      firm: "WongPartnership",
      title: "IP Enforcement Trends",
      date: "8 Nov 2025",
      category: "IP"
    },
    {
      firm: "Drew & Napier",
      title: "Employment Law Changes 2025",
      date: "5 Nov 2025",
      category: "Employment"
    }
  ];

  const newsUpdates = [
    {
      source: "The Business Times",
      title: "New Securities Regulations Proposed",
      time: "2 hours ago",
      relevance: "High"
    },
    {
      source: "The Straits Times",
      title: "Court of Appeal Rules on Data Protection",
      time: "5 hours ago",
      relevance: "Medium"
    },
    {
      source: "Channel NewsAsia",
      title: "MAS Updates Banking Guidelines",
      time: "1 day ago",
      relevance: "High"
    }
  ];

  const courtData = [
    {
      court: "Court of Appeal",
      cases: "1,250",
      recent: "45 new judgments"
    },
    {
      court: "High Court",
      cases: "8,900",
      recent: "120 new judgments"
    },
    {
      court: "State Courts",
      cases: "15,400",
      recent: "230 new judgments"
    }
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-6">

        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search across jurisdictions, case law, statutes, and legal updates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="default">Search</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="databases" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="databases">Databases</TabsTrigger>
          <TabsTrigger value="reports">Law Firm Reports</TabsTrigger>
          <TabsTrigger value="news">Legal News</TabsTrigger>
          <TabsTrigger value="courts">Court Data</TabsTrigger>
        </TabsList>

        {/* Databases Tab */}
        <TabsContent value="databases" className="space-y-6">
          {/* Jurisdictions */}
          <div>
            <h2 className="text-2xl font-light text-foreground mb-4">Select Jurisdiction</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jurisdictions.map((jurisdiction) => (
                <Card
                  key={jurisdiction.name}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedJurisdiction(jurisdiction.name)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="font-medium text-foreground">{jurisdiction.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{jurisdiction.count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Law Types */}
          <div>
            <h2 className="text-2xl font-light text-foreground mb-4">Practice Areas</h2>
            <div className="flex flex-wrap gap-2">
              {lawTypes.map((type) => (
                <Badge
                  key={type}
                  variant="outline"
                  className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Singapore Sources */}
          {selectedJurisdiction === "Singapore" && (
            <div>
              <h2 className="text-2xl font-light text-foreground mb-4">Singapore Legal Sources</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {singaporeSources.map((source) => (
                  <Card key={source.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <source.icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-light">{source.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{source.type}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Documents</p>
                          <p className="font-medium text-foreground">{source.docs}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Updated</p>
                          <p className="font-medium text-foreground">{source.updated}</p>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        Access Database
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Law Firm Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <h2 className="text-2xl font-light text-foreground">Recent Law Firm Publications</h2>
          <div className="grid gap-4">
            {lawFirmReports.map((report, idx) => (
              <Card key={idx} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{report.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                          <span>{report.firm}</span>
                          <span>•</span>
                          <span>{report.date}</span>
                          <Badge variant="secondary">{report.category}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost">
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Legal News Tab */}
        <TabsContent value="news" className="space-y-6">
          <h2 className="text-2xl font-light text-foreground">Latest Legal News</h2>
          <div className="grid gap-4">
            {newsUpdates.map((news, idx) => (
              <Card key={idx} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Newspaper className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{news.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                          <span>{news.source}</span>
                          <span>•</span>
                          <span>{news.time}</span>
                          <Badge 
                            variant={news.relevance === "High" ? "default" : "secondary"}
                          >
                            {news.relevance} Relevance
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost">
                      Read More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Court Data Tab */}
        <TabsContent value="courts" className="space-y-6">
          <h2 className="text-2xl font-light text-foreground">Singapore Court System</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {courtData.map((court) => (
              <Card key={court.court}>
                <CardHeader>
                  <div className="p-3 bg-primary/10 rounded-full w-fit mb-3">
                    <Gavel className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-light">{court.court}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-light text-primary">{court.cases}</p>
                    <p className="text-sm text-muted-foreground">Total Cases</p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">{court.recent}</span>
                  </div>
                  <Button className="w-full" variant="outline">
                    Browse Judgments
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResearchApp;