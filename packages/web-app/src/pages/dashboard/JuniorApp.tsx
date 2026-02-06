import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const JuniorApp = () => {
  const recentDocuments = [
    {
      id: 1,
      name: "Financial_Report_Q4.pdf",
      type: "Circle Up",
      date: "2 hours ago",
      status: "complete"
    },
    {
      id: 2,
      name: "Partnership_Agreement.pdf",
      type: "Signature Pages",
      date: "5 hours ago",
      status: "complete"
    },
    {
      id: 3,
      name: "Investment_Memo.pdf",
      type: "Circle Up",
      date: "Yesterday",
      status: "complete"
    },
    {
      id: 4,
      name: "Service_Contract.pdf",
      type: "Signature Pages",
      date: "2 days ago",
      status: "complete"
    }
  ];

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* Function Cards */}
      <div>
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/dashboard/junior/circle-up">
            <Card className="p-8 hover:shadow-lg hover:border-primary/50 transition-smooth cursor-pointer h-full">
              <div className="text-center space-y-4">
                <CardTitle className="text-2xl font-light">Circle Up</CardTitle>
                <p className="text-muted-foreground font-light">
                  Intelligently circle and highlight numbers in PDF documents for quick financial analysis and review.
                </p>
                <Button variant="outline" className="mt-4">
                  Open Circle Up →
                </Button>
              </div>
            </Card>
          </Link>

          <Link to="/dashboard/junior/signature-pages">
            <Card className="p-8 hover:shadow-lg hover:border-primary/50 transition-smooth cursor-pointer h-full">
              <div className="text-center space-y-4">
                <CardTitle className="text-2xl font-light">Signature Pages</CardTitle>
                <p className="text-muted-foreground font-light">
                  Automatically generate professional signature pages from agreement templates with proper formatting.
                </p>
                <Button variant="outline" className="mt-4">
                  Open Signature Pages →
                </Button>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Document History */}
      <div>
        <h2 className="text-2xl font-light text-foreground mb-6">Recent Documents</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{doc.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="capitalize">{doc.status}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JuniorApp;