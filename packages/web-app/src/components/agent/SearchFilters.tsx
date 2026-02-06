import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SearchFiltersProps {
  whitelist: string[];
  blacklist: string[];
  onWhitelistChange: (list: string[]) => void;
  onBlacklistChange: (list: string[]) => void;
}

export default function SearchFilters({
  whitelist,
  blacklist,
  onWhitelistChange,
  onBlacklistChange
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [whitelistInput, setWhitelistInput] = useState("");
  const [blacklistInput, setBlacklistInput] = useState("");

  const addToWhitelist = () => {
    if (whitelistInput.trim() && !whitelist.includes(whitelistInput.trim())) {
      onWhitelistChange([...whitelist, whitelistInput.trim()]);
      setWhitelistInput("");
    }
  };

  const addToBlacklist = () => {
    if (blacklistInput.trim() && !blacklist.includes(blacklistInput.trim())) {
      onBlacklistChange([...blacklist, blacklistInput.trim()]);
      setBlacklistInput("");
    }
  };

  const removeFromWhitelist = (domain: string) => {
    onWhitelistChange(whitelist.filter(d => d !== domain));
  };

  const removeFromBlacklist = (domain: string) => {
    onBlacklistChange(blacklist.filter(d => d !== domain));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Search Filters
          {(whitelist.length > 0 || blacklist.length > 0) && (
            <Badge variant="secondary" className="ml-2">
              {whitelist.length + blacklist.length}
            </Badge>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Whitelist Domains</label>
            <p className="text-xs text-muted-foreground">
              Only search these domains (e.g., nytimes.com)
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="domain.com"
                value={whitelistInput}
                onChange={(e) => setWhitelistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
              />
              <Button onClick={addToWhitelist} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {whitelist.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {whitelist.map((domain) => (
                  <Badge key={domain} variant="secondary" className="gap-1">
                    {domain}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromWhitelist(domain)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Blacklist Domains</label>
            <p className="text-xs text-muted-foreground">
              Exclude these domains from search
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="domain.com"
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToBlacklist()}
              />
              <Button onClick={addToBlacklist} size="icon" variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {blacklist.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {blacklist.map((domain) => (
                  <Badge key={domain} variant="destructive" className="gap-1">
                    {domain}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromBlacklist(domain)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
