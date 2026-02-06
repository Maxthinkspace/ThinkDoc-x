import * as React from "react";
import { RefreshCw, Briefcase, Shield, BookOpen, Database, Cloud, Zap, ChevronRight } from "lucide-react";
import { makeStyles, tokens, Tab, TabList } from "@fluentui/react-components";
import type { SelectTabData, SelectTabEvent, TabValue } from "@fluentui/react-components";
import { useNavigation } from "../../hooks/use-navigation";
import { useLanguage } from "../../contexts/LanguageContext";
import "./styles/VaultPage.css";

interface VaultListItem {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  active?: boolean;
  route?: string;
}

export const VaultPage: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { translations } = useLanguage();
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("Precedent");

  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value);
  };

  // Precedent tab items: Project Library + Clauses & Precedents
  const precedentItems: VaultListItem[] = [
    {
      icon: <Briefcase size={20} />,
      title: translations.vault.projectLibrary,
      subtitle: translations.vault.projectLibrarySubtitle,
      active: true,
      route: "library",
    },
    {
      icon: <Database size={20} />,
      title: translations.vault.clausesPrecedents,
      subtitle: translations.vault.clausesPrecedentsSubtitle,
      active: true,
      route: "clause-library",
    },
  ];

  // Playbook tab items: Playbook Library only
  const playbookItems: VaultListItem[] = [
    {
      icon: <BookOpen size={20} />,
      title: translations.vault.playbookLibrary,
      subtitle: translations.vault.playbookLibrarySubtitle,
      active: true,
      route: "library",
    },
  ];

  return (
    <div className="vault-page">
      {/* Header */}
      <div className="vault-header">
        <button className="vault-refresh-button" aria-label="Refresh">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="vault-tabs-container">
        <TabList className="vault-tab-list" selectedValue={selectedTab} onTabSelect={onTabSelect}>
          <Tab className="vault-tab" id="Precedent" value="Precedent">
            {translations.vault.precedent}
          </Tab>
          <Tab className="vault-tab" id="Playbook" value="Playbook">
            {translations.vault.playbook}
          </Tab>
        </TabList>
      </div>

      {/* Content */}
      <div className="vault-content">
        {selectedTab === "Precedent" && (
          <>
            {/* Precedent Section */}
            <div className="vault-section">
              <div className="vault-list">
                {precedentItems.map((item, index) => (
                  <div
                    key={index}
                    className={`vault-item ${item.active ? "active" : "disabled"}`}
                    onClick={() => item.active && item.route && navigateTo(item.route as any)}
                  >
                    <div className="vault-item-icon">{item.icon}</div>
                    <div className="vault-item-text">
                      <div className="vault-item-title">{item.title}</div>
                      <div className="vault-item-subtitle">{item.subtitle}</div>
                    </div>
                    {item.active && <ChevronRight size={16} className="vault-item-chevron" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Import External Resources */}
            <div className="vault-section">
              <div className="vault-import-item">
                <div className="vault-import-icon">
                  <Cloud size={20} />
                  <Zap size={12} className="vault-import-bolt" />
                </div>
                <div className="vault-item-text">
                  <div className="vault-item-title">{translations.vault.importExternalResources}</div>
                  <div className="vault-item-subtitle">{translations.vault.importExternalResourcesSubtitle}</div>
                </div>
                <ChevronRight size={16} className="vault-item-chevron" />
              </div>
            </div>
          </>
        )}

        {selectedTab === "Playbook" && (
          <>
            {/* Playbook Section */}
            <div className="vault-section">
              <div className="vault-list">
                {playbookItems.map((item, index) => (
                  <div
                    key={index}
                    className={`vault-item ${item.active ? "active" : "disabled"}`}
                    onClick={() => item.active && item.route && navigateTo(item.route as any)}
                  >
                    <div className="vault-item-icon">{item.icon}</div>
                    <div className="vault-item-text">
                      <div className="vault-item-title">{item.title}</div>
                      <div className="vault-item-subtitle">{item.subtitle}</div>
                    </div>
                    {item.active && <ChevronRight size={16} className="vault-item-chevron" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Import External Resources */}
            <div className="vault-section">
              <div className="vault-import-item">
                <div className="vault-import-icon">
                  <Cloud size={20} />
                </div>
                <div className="vault-item-text">
                  <div className="vault-item-title">{translations.vault.importExternalResources}</div>
                  <div className="vault-item-subtitle">{translations.vault.importExternalResourcesSubtitle}</div>
                </div>
                <ChevronRight size={16} className="vault-item-chevron" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

