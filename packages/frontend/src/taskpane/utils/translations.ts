/**
 * Translation System
 * Supports multiple languages for the add-in
 */

export type LanguageCode = "en" | "zh" | "es" | "fr" | "ja" | "de";

export interface Translations {
  // Common
  common: {
    back: string;
    add: string;
    cancel: string;
    confirm: string;
    save: string;
    saving: string;
    delete: string;
    edit: string;
    close: string;
    loading: string;
    error: string;
    retry: string;
    ask: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    vault: string;
    history: string;
    setup: string;
  };

  // Dashboard
  dashboard: {
    review: string;
    draft: string;
    understandChanges: string;
    analysisStrategy: string;
    summariseRedlines: string;
    summariseRedlinesSubtitle: string;
    understandRedlines: string;
    understandRedlinesSubtitle: string;
    playbookReview: string;
    playbookReviewSubtitle: string;
    precedentReview: string;
    precedentReviewSubtitle: string;
    generalReview: string;
    generalReviewSubtitle: string;
    checkDefinitions: string;
    checkDefinitionsSubtitle: string;
    negotiation: string;
    negotiationSubtitle: string;
    translation: string;
    translationSubtitle: string;
    draftClause: string;
    draftClauseSubtitle: string;
    completeParagraph: string;
    completeParagraphSubtitle: string;
    fullDocument: string;
    fullDocumentSubtitle: string;
    createTable: string;
    createTableSubtitle: string;
    formFiller: string;
    formFillerSubtitle: string;
    draftFromScratch: string;
    draftFromScratchSubtitle: string;
    redomicile: string;
    redomicileSubtitle: string;
    generateIssueList: string;
    generateIssueListSubtitle: string;
    summarizeNegotiationPositions: string;
    summarizeNegotiationPositionsSubtitle: string;
    redaction: string;
    redactionSubtitle: string;
    disabledReasonRunReviewFirst: string;
  };

  // Vault
  vault: {
    library: string;
    standards: string;
    precedent: string;
    playbook: string;
    organizationAssets: string;
    legalKnowledge: string;
    projectLibrary: string;
    projectLibrarySubtitle: string;
    complianceRules: string;
    complianceRulesSubtitle: string;
    playbookLibrary: string;
    playbookLibrarySubtitle: string;
    clausesPrecedents: string;
    clausesPrecedentsSubtitle: string;
    importExternalResources: string;
    importExternalResourcesSubtitle: string;
  };

  // History
  history: {
    title: string;
    all: string;
    review: string;
    draft: string;
    playbook: string;
    precedent: string;
    noActivities: string;
    noActivitiesSubtitle: string;
    loadingActivities: string;
  };

  // Setup
  setup: {
    accountIdentity: string;
    systemPreferences: string;
    resources: string;
    personalProfile: string;
    sharingTeam: string;
    manageAccess: string;
    billingPlan: string;
    language: string;
    redactionMasking: string;
    privacyControls: string;
    emailNotifications: string;
    emailNotificationsSubtitle: string;
    changePassword: string;
    changePasswordSubtitle: string;
    helpDocumentation: string;
    helpDocumentationSubtitle: string;
    logOut: string;
  };

  // Language Page
  language: {
    title: string;
    english: string;
    chinese: string;
    spanish: string;
    french: string;
    japanese: string;
    german: string;
  };

  // Profile Page
  profile: {
    title: string;
    emailAddress: string;
    accountId: string;
    signOut: string;
  };

  // Sharing Page
  sharing: {
    title: string;
    activeTeamAccess: string;
    inviteMember: string;
    partner: string;
    juniorAssociate: string;
  };

  // Help & Support Page
  helpSupport: {
    title: string;
    userGuide: string;
    tutorials: string;
    supportChat: string;
    concierge247: string;
    termsOfService: string;
    privacyPolicy: string;
    faq: string;
    contactSupport: string;
    legalPolicies: string;
  };

  // Translation Page
  translationPage: {
    sourceLanguage: string;
    targetLanguage: string;
    translationMode: string;
    selectedText: string;
    translatedText: string;
    insertBelow: string;
    insertAbove: string;
    replaceText: string;
    refreshSelection: string;
    translate: string;
    translating: string;
    noTextSelected: string;
    loadingSelectedText: string;
    translationApplied: string;
  };

  // Context Menu
  contextMenu: {
    selectedText: string;
    askAI: string;
    saveClause: string;
    autoComment: string;
    checkCompliance: string;
    loading: string;
    clauseText: string;
    clauseName: string;
    clauseNamePlaceholder: string;
    category: string;
    categoryPlaceholder: string;
    tags: string;
    tagsPlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
  };

  // Negotiation Page
  negotiationPage: {
    title: string;
    selectPosition: string;
    positionBuyer: string;
    positionSeller: string;
    positionLessor: string;
    positionLessee: string;
    positionLicensor: string;
    positionLicensee: string;
    positionEmployer: string;
    positionEmployee: string;
    positionCustom: string;
    customPositionPlaceholder: string;
    customPositionRequired: string;
    negotiationInstructions: string;
    instructionPlaceholder: string;
    textScope: string;
    selectedText: string;
    wholeDocument: string;
    loadingText: string;
    refreshSelection: string;
    noTextSelected: string;
    referenceLibrary: string;
    noReference: string;
    clauseLibrary: string;
    playbookLibrary: string;
    vaultProject: string;
    selectReference: string;
    noClauses: string;
    noPlaybooks: string;
    noProjects: string;
    parsingDocument: string;
    loadingReferences: string;
    analyzing: string;
    completing: string;
    success: string;
    successDescription: string;
    error: string;
    runAnalysis: string;
    suggestedAmendments: string;
    noInstructions: string;
    addInstruction: string;
  };

  // Clause Library Page
  clauseLibrary: {
    title: string;
    loading: string;
    noClauses: string;
    createClause: string;
    editClause: string;
    deleteClause: string;
    deleteClauseConfirm: string;
    deleteClauseWarning: string;
    clauseDeleted: string;
    clauseDeletedDescription: string;
    clauseDuplicated: string;
    clauseDuplicatedDescription: string;
    viewClause: string;
    clauseName: string;
    clauseNamePlaceholder: string;
    clauseText: string;
    clauseTextPlaceholder: string;
    category: string;
    categoryPlaceholder: string;
    tags: string;
    tagsPlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    validationError: string;
    loadSelection: string;
    loadSelectionHint: string;
    loadingSelection: string;
    error: string;
  };
}

const translations: Record<LanguageCode, Translations> = {
  en: {
    common: {
      back: "Back",
      add: "Add",
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save",
      saving: "Saving...",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      loading: "Loading...",
      error: "Error",
      retry: "Retry",
      ask: "Ask",
    },
    nav: {
      dashboard: "DASHBOARD",
      vault: "VAULT",
      history: "HISTORY",
      setup: "SETUP",
    },
    dashboard: {
      review: "Review",
      draft: "Draft",
      understandChanges: "UNDERSTAND CHANGES",
      analysisStrategy: "ANALYSIS & STRATEGY",
      summariseRedlines: "Summarise Redlines",
      summariseRedlinesSubtitle: "Executive summary of changes",
      understandRedlines: "Understand Redlines",
      understandRedlinesSubtitle: "Analyze tracked changes",
      playbookReview: "Playbook Review",
      playbookReviewSubtitle: "Review contract against company standards",
      precedentReview: "Precedent Review",
      precedentReviewSubtitle: "Compare against previous deal standards",
      generalReview: "General Review",
      generalReviewSubtitle: "Standard compliance and risk check",
      checkDefinitions: "Check Definitions",
      checkDefinitionsSubtitle: "Validate consistent use of defined terms",
      negotiation: "Negotiation",
      negotiationSubtitle: "Strategic advice for counter-party terms",
      translation: "Translation",
      translationSubtitle: "Translate legal text into other languages",
      draftClause: "Draft a Clause",
      draftClauseSubtitle: "Generate specific contractual language",
      completeParagraph: "Complete Paragraph",
      completeParagraphSubtitle: "Expand on existing text with AI",
      fullDocument: "Full Document",
      fullDocumentSubtitle: "Create an entire document from a prompt",
      createTable: "Create Table",
      createTableSubtitle: "Generate tables for data or summaries",
      formFiller: "Form Filler",
      formFillerSubtitle: "Automatically fill out forms and templates",
      draftFromScratch: "Draft from Scratch",
      draftFromScratchSubtitle: "Create new legal content from a blank slate",
      redomicile: "Redomicile / Re-localise",
      redomicileSubtitle: "Adapt legal documents for different jurisdictions",
      generateIssueList: "Generate Issue List",
      generateIssueListSubtitle: "Create a comprehensive list of identified issues",
      summarizeNegotiationPositions: "Summarize Negotiation Positions",
      summarizeNegotiationPositionsSubtitle: "Extract and summarize key negotiation points",
      redaction: "Redaction",
      redactionSubtitle: "Select and redact sensitive text from document",
      disabledReasonRunReviewFirst: "Run Review first to detect issues",
    },
    vault: {
      library: "Library",
      standards: "Standards",
      precedent: "Precedent",
      playbook: "Playbook",
      organizationAssets: "ORGANIZATION ASSETS",
      legalKnowledge: "LEGAL KNOWLEDGE",
      projectLibrary: "Project Library",
      projectLibrarySubtitle: "Access all your project documents",
      complianceRules: "Compliance Rules",
      complianceRulesSubtitle: "Manage regulatory compliance rules",
      playbookLibrary: "Playbook Library",
      playbookLibrarySubtitle: "Access all your playbooks",
      clausesPrecedents: "Clauses & Precedents",
      clausesPrecedentsSubtitle: "Browse and manage standard clauses",
      importExternalResources: "Import External Resources",
      importExternalResourcesSubtitle: "Add external documents and resources",
    },
    history: {
      title: "History",
      all: "All",
      review: "Review",
      draft: "Draft",
      playbook: "Playbook",
      precedent: "Precedent",
      noActivities: "No activities yet",
      noActivitiesSubtitle: "Your recent activities will appear here",
      loadingActivities: "Loading activities...",
    },
    setup: {
      accountIdentity: "ACCOUNT & IDENTITY",
      systemPreferences: "SYSTEM PREFERENCES",
      resources: "RESOURCES",
      personalProfile: "Personal Profile",
      sharingTeam: "Sharing & Team",
      manageAccess: "MANAGE ACCESS",
      billingPlan: "Billing & Plan",
      language: "Language",
      redactionMasking: "Redaction & Masking",
      privacyControls: "PRIVACY CONTROLS",
      emailNotifications: "Email Notifications",
      emailNotificationsSubtitle: "RECEIVE UPDATES VIA EMAIL",
      changePassword: "Change Password",
      changePasswordSubtitle: "UPDATE YOUR PASSWORD",
      helpDocumentation: "Help & Documentation",
      helpDocumentationSubtitle: "GUIDES & SUPPORT",
      logOut: "Log Out",
    },
    language: {
      title: "Language",
      english: "English",
      chinese: "Chinese",
      spanish: "Spanish",
      french: "French",
      japanese: "Japanese",
      german: "German",
    },
    profile: {
      title: "Profile",
      emailAddress: "EMAIL ADDRESS",
      accountId: "ACCOUNT ID",
      signOut: "SIGN OUT",
    },
    sharing: {
      title: "Sharing",
      activeTeamAccess: "ACTIVE TEAM ACCESS",
      inviteMember: "INVITE MEMBER",
      partner: "PARTNER",
      juniorAssociate: "JUNIOR ASSOCIATE",
    },
    helpSupport: {
      title: "Help & Support",
      userGuide: "User Guide",
      tutorials: "TUTORIALS",
      supportChat: "Support Chat",
      concierge247: "24/7 CONCIERGE",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      faq: "FAQ",
      contactSupport: "Contact Support",
      legalPolicies: "LEGAL & POLICIES",
    },
    translationPage: {
      sourceLanguage: "SOURCE LANGUAGE",
      targetLanguage: "TARGET LANGUAGE",
      translationMode: "TRANSLATION MODE",
      selectedText: "SELECTED TEXT",
      translatedText: "TRANSLATED TEXT",
      insertBelow: "Insert Below",
      insertAbove: "Insert Above",
      replaceText: "Replace Text",
      refreshSelection: "Refresh Selection",
      translate: "Translate",
      translating: "Translating...",
      noTextSelected: "No text selected. Please select text in the document.",
      loadingSelectedText: "Loading selected text...",
      translationApplied: "Translation applied successfully!",
    },
    contextMenu: {
      selectedText: "Selected Text",
      askAI: "Ask AI",
      saveClause: "Save as Clause",
      autoComment: "Auto Comment",
      checkCompliance: "Check Compliance",
      loading: "Detecting selection...",
      clauseText: "Clause Text",
      clauseName: "Clause Name",
      clauseNamePlaceholder: "Enter clause name",
      category: "Category",
      categoryPlaceholder: "e.g., Confidentiality, Termination",
      tags: "Tags",
      tagsPlaceholder: "Comma-separated tags",
      description: "Description",
      descriptionPlaceholder: "Optional description",
    },
    negotiationPage: {
      title: "Negotiation",
      selectPosition: "SELECT POSITION",
      positionBuyer: "Buyer",
      positionSeller: "Seller",
      positionLessor: "Lessor",
      positionLessee: "Lessee",
      positionLicensor: "Licensor",
      positionLicensee: "Licensee",
      positionEmployer: "Employer",
      positionEmployee: "Employee",
      positionCustom: "Custom",
      customPositionPlaceholder: "Enter your position",
      customPositionRequired: "Please enter your custom position",
      negotiationInstructions: "NEGOTIATION INSTRUCTIONS",
      instructionPlaceholder: "Add negotiation point or instruction...",
      textScope: "TEXT SCOPE",
      selectedText: "Selected Text",
      wholeDocument: "Whole Document",
      loadingText: "Loading selected text...",
      refreshSelection: "Refresh",
      noTextSelected: "No text selected. Please select text in the document.",
      referenceLibrary: "REFERENCE LIBRARY (OPTIONAL)",
      noReference: "No Reference",
      clauseLibrary: "Clause Library",
      playbookLibrary: "Playbook Library",
      vaultProject: "Vault Project",
      selectReference: "Select Reference",
      noClauses: "No clauses available",
      noPlaybooks: "No playbooks available",
      noProjects: "No projects available",
      parsingDocument: "Parsing document...",
      loadingReferences: "Loading references...",
      analyzing: "Analyzing negotiation points...",
      completing: "Completing...",
      success: "Negotiation Analysis Complete",
      successDescription: "Suggested amendments have been generated",
      error: "Error",
      runAnalysis: "Run Negotiation Analysis",
      suggestedAmendments: "Suggested Amendments",
      noInstructions: "Please add at least one negotiation instruction",
      addInstruction: "Add",
    },
    clauseLibrary: {
      title: "Clause Library",
      loading: "Loading clauses...",
      noClauses: "No clauses found. Create your first clause to get started!",
      createClause: "Create Clause",
      editClause: "Edit Clause",
      deleteClause: "Delete Clause",
      deleteClauseConfirm: "Are you sure you want to delete",
      deleteClauseWarning: " This action cannot be undone.",
      clauseDeleted: "Clause Deleted",
      clauseDeletedDescription: "Clause has been deleted successfully",
      clauseDuplicated: "Clause Duplicated",
      clauseDuplicatedDescription: "Clause has been duplicated successfully",
      viewClause: "View Clause",
      clauseName: "Clause Name",
      clauseNamePlaceholder: "Enter clause name",
      clauseText: "Clause Text",
      clauseTextPlaceholder: "Enter clause text or load from selection",
      category: "Category",
      categoryPlaceholder: "e.g., Confidentiality, Termination",
      tags: "Tags",
      tagsPlaceholder: "Comma-separated tags",
      description: "Description",
      descriptionPlaceholder: "Optional description",
      validationError: "Name and text are required",
      loadSelection: "Load Selection",
      loadSelectionHint: "Select text in document and click 'Load Selection'",
      loadingSelection: "Loading...",
      error: "Error",
    },
  },
  zh: {
    common: {
      back: "返回",
      add: "添加",
      cancel: "取消",
      confirm: "确认",
      save: "保存",
      saving: "保存中...",
      delete: "删除",
      edit: "编辑",
      close: "关闭",
      loading: "加载中...",
      error: "错误",
      retry: "重试",
      ask: "询问",
    },
    nav: {
      dashboard: "仪表板",
      vault: "保险库",
      history: "历史",
      setup: "设置",
    },
    dashboard: {
      review: "审查",
      draft: "起草",
      understandChanges: "了解变更",
      analysisStrategy: "分析与策略",
      summariseRedlines: "总结修订",
      summariseRedlinesSubtitle: "变更的执行摘要",
      understandRedlines: "理解修订",
      understandRedlinesSubtitle: "分析跟踪的变更",
      playbookReview: "剧本审查",
      playbookReviewSubtitle: "根据公司标准审查合同",
      precedentReview: "先例审查",
      precedentReviewSubtitle: "与之前的交易标准进行比较",
      generalReview: "一般审查",
      generalReviewSubtitle: "标准合规性和风险检查",
      checkDefinitions: "检查定义",
      checkDefinitionsSubtitle: "验证定义术语的一致使用",
      negotiation: "谈判",
      negotiationSubtitle: "对对方条款的战略建议",
      translation: "翻译",
      translationSubtitle: "将法律文本翻译成其他语言",
      draftClause: "起草条款",
      draftClauseSubtitle: "生成特定的合同语言",
      completeParagraph: "完成段落",
      completeParagraphSubtitle: "使用AI扩展现有文本",
      fullDocument: "完整文档",
      fullDocumentSubtitle: "从提示创建整个文档",
      createTable: "创建表格",
      createTableSubtitle: "生成数据或摘要表格",
      formFiller: "表单填充器",
      formFillerSubtitle: "自动填写表单和模板",
      draftFromScratch: "从头起草",
      draftFromScratchSubtitle: "从空白开始创建新的法律内容",
      redomicile: "重新注册/重新本地化",
      redomicileSubtitle: "使法律文件适应不同司法管辖区",
      generateIssueList: "生成问题列表",
      generateIssueListSubtitle: "创建已识别问题的综合列表",
      summarizeNegotiationPositions: "总结谈判立场",
      summarizeNegotiationPositionsSubtitle: "提取并总结关键谈判要点",
      redaction: "文本遮蔽",
      redactionSubtitle: "选择并遮蔽文档中的敏感文本",
      disabledReasonRunReviewFirst: "请先运行审查以检测问题",
    },
    vault: {
      library: "库",
      standards: "标准",
      precedent: "先例",
      playbook: "剧本",
      organizationAssets: "组织资产",
      legalKnowledge: "法律知识",
      projectLibrary: "项目库",
      projectLibrarySubtitle: "访问您的所有项目文档",
      complianceRules: "合规规则",
      complianceRulesSubtitle: "管理监管合规规则",
      playbookLibrary: "剧本库",
      playbookLibrarySubtitle: "访问您的所有剧本",
      clausesPrecedents: "条款和先例",
      clausesPrecedentsSubtitle: "浏览和管理标准条款",
      importExternalResources: "导入外部资源",
      importExternalResourcesSubtitle: "添加外部文档和资源",
    },
    history: {
      title: "历史",
      all: "全部",
      review: "审查",
      draft: "起草",
      playbook: "剧本",
      precedent: "先例",
      noActivities: "暂无活动",
      noActivitiesSubtitle: "您的最近活动将显示在这里",
      loadingActivities: "加载活动中...",
    },
    setup: {
      accountIdentity: "账户与身份",
      systemPreferences: "系统偏好",
      resources: "资源",
      personalProfile: "个人资料",
      sharingTeam: "共享与团队",
      manageAccess: "管理访问",
      billingPlan: "计费和计划",
      language: "语言",
      redactionMasking: "编辑与遮罩",
      privacyControls: "隐私控制",
      emailNotifications: "电子邮件通知",
      emailNotificationsSubtitle: "通过电子邮件接收更新",
      changePassword: "更改密码",
      changePasswordSubtitle: "更新您的密码",
      helpDocumentation: "帮助与文档",
      helpDocumentationSubtitle: "指南和支持",
      logOut: "登出",
    },
    language: {
      title: "语言",
      english: "英语",
      chinese: "中文",
      spanish: "西班牙语",
      french: "法语",
      japanese: "日语",
      german: "德语",
    },
    profile: {
      title: "个人资料",
      emailAddress: "电子邮件地址",
      accountId: "账户ID",
      signOut: "登出",
    },
    sharing: {
      title: "共享",
      activeTeamAccess: "活跃团队访问",
      inviteMember: "邀请成员",
      partner: "合伙人",
      juniorAssociate: "初级助理",
    },
    helpSupport: {
      title: "帮助与支持",
      userGuide: "用户指南",
      tutorials: "教程",
      supportChat: "支持聊天",
      concierge247: "24/7 礼宾服务",
      termsOfService: "服务条款",
      privacyPolicy: "隐私政策",
      faq: "常见问题",
      contactSupport: "联系支持",
      legalPolicies: "法律与政策",
    },
    translationPage: {
      sourceLanguage: "源语言",
      targetLanguage: "目标语言",
      translationMode: "翻译模式",
      selectedText: "选中的文本",
      translatedText: "翻译后的文本",
      insertBelow: "在下方插入",
      insertAbove: "在上方插入",
      replaceText: "替换文本",
      refreshSelection: "刷新选择",
      translate: "翻译",
      translating: "翻译中...",
      noTextSelected: "未选择文本。请在文档中选择文本。",
      loadingSelectedText: "加载选中的文本...",
      translationApplied: "翻译应用成功！",
    },
    contextMenu: {
      selectedText: "选中的文本",
      askAI: "询问AI",
      saveClause: "保存为条款",
      autoComment: "自动评论",
      checkCompliance: "检查合规性",
      loading: "检测选择中...",
      clauseText: "条款文本",
      clauseName: "条款名称",
      clauseNamePlaceholder: "输入条款名称",
      category: "类别",
      categoryPlaceholder: "例如：保密、终止",
      tags: "标签",
      tagsPlaceholder: "逗号分隔的标签",
      description: "描述",
      descriptionPlaceholder: "可选描述",
    },
    negotiationPage: {
      title: "谈判",
      selectPosition: "选择立场",
      positionBuyer: "买方",
      positionSeller: "卖方",
      positionLessor: "出租人",
      positionLessee: "承租人",
      positionLicensor: "许可人",
      positionLicensee: "被许可人",
      positionEmployer: "雇主",
      positionEmployee: "雇员",
      positionCustom: "自定义",
      customPositionPlaceholder: "输入您的立场",
      customPositionRequired: "请输入您的自定义立场",
      negotiationInstructions: "谈判指示",
      instructionPlaceholder: "添加谈判要点或指示...",
      textScope: "文本范围",
      selectedText: "选定文本",
      wholeDocument: "整个文档",
      loadingText: "加载选定文本中...",
      refreshSelection: "刷新",
      noTextSelected: "未选择文本。请在文档中选择文本。",
      referenceLibrary: "参考库（可选）",
      noReference: "无参考",
      clauseLibrary: "条款库",
      playbookLibrary: "剧本库",
      vaultProject: "保险库项目",
      selectReference: "选择参考",
      noClauses: "无可用条款",
      noPlaybooks: "无可用剧本",
      noProjects: "无可用项目",
      parsingDocument: "解析文档中...",
      loadingReferences: "加载参考中...",
      analyzing: "分析谈判要点中...",
      completing: "完成中...",
      success: "谈判分析完成",
      successDescription: "已生成建议修正",
      error: "错误",
      runAnalysis: "运行谈判分析",
      suggestedAmendments: "建议修正",
      noInstructions: "请至少添加一条谈判指示",
      addInstruction: "添加",
    },
    clauseLibrary: {
      title: "条款库",
      loading: "加载条款中...",
      noClauses: "未找到条款。创建您的第一个条款开始使用！",
      createClause: "创建条款",
      editClause: "编辑条款",
      deleteClause: "删除条款",
      deleteClauseConfirm: "您确定要删除",
      deleteClauseWarning: "此操作无法撤销。",
      clauseDeleted: "条款已删除",
      clauseDeletedDescription: "条款已成功删除",
      clauseDuplicated: "条款已复制",
      clauseDuplicatedDescription: "条款已成功复制",
      viewClause: "查看条款",
      clauseName: "条款名称",
      clauseNamePlaceholder: "输入条款名称",
      clauseText: "条款文本",
      clauseTextPlaceholder: "输入条款文本或从选择中加载",
      category: "类别",
      categoryPlaceholder: "例如：保密、终止",
      tags: "标签",
      tagsPlaceholder: "逗号分隔的标签",
      description: "描述",
      descriptionPlaceholder: "可选描述",
      validationError: "名称和文本为必填项",
      loadSelection: "加载选择",
      loadSelectionHint: "在文档中选择文本并点击「加载选择」",
      loadingSelection: "加载中...",
      error: "错误",
    },
  },
  es: {
    common: {
      back: "Atrás",
      add: "Añadir",
      cancel: "Cancelar",
      confirm: "Confirmar",
      save: "Guardar",
      saving: "Guardando...",
      delete: "Eliminar",
      edit: "Editar",
      close: "Cerrar",
      loading: "Cargando...",
      error: "Error",
      retry: "Reintentar",
      ask: "Preguntar",
    },
    nav: {
      dashboard: "PANEL",
      vault: "BÓVEDA",
      history: "HISTORIAL",
      setup: "CONFIGURACIÓN",
    },
    dashboard: {
      review: "Revisar",
      draft: "Borrador",
      understandChanges: "ENTENDER CAMBIOS",
      analysisStrategy: "ANÁLISIS Y ESTRATEGIA",
      summariseRedlines: "Resumir Marcas",
      summariseRedlinesSubtitle: "Resumen ejecutivo de cambios",
      understandRedlines: "Entender Marcas",
      understandRedlinesSubtitle: "Analizar cambios rastreados",
      playbookReview: "Revisión de Guía",
      playbookReviewSubtitle: "Revisar contrato según estándares de la empresa",
      precedentReview: "Revisión de Precedentes",
      precedentReviewSubtitle: "Comparar con estándares de acuerdos anteriores",
      generalReview: "Revisión General",
      generalReviewSubtitle: "Verificación estándar de cumplimiento y riesgo",
      checkDefinitions: "Verificar Definiciones",
      checkDefinitionsSubtitle: "Validar uso consistente de términos definidos",
      negotiation: "Negociación",
      negotiationSubtitle: "Consejo estratégico para términos de contraparte",
      translation: "Traducción",
      translationSubtitle: "Traducir texto legal a otros idiomas",
      draftClause: "Redactar una Cláusula",
      draftClauseSubtitle: "Generar lenguaje contractual específico",
      completeParagraph: "Completar Párrafo",
      completeParagraphSubtitle: "Expandir texto existente con IA",
      fullDocument: "Documento Completo",
      fullDocumentSubtitle: "Crear un documento completo desde un prompt",
      createTable: "Crear Tabla",
      createTableSubtitle: "Generar tablas para datos o resúmenes",
      formFiller: "Rellenador de Formularios",
      formFillerSubtitle: "Rellenar automáticamente formularios y plantillas",
      draftFromScratch: "Redactar desde Cero",
      draftFromScratchSubtitle: "Crear nuevo contenido legal desde cero",
      redomicile: "Redomiciliar / Re-localizar",
      redomicileSubtitle: "Adaptar documentos legales para diferentes jurisdicciones",
      generateIssueList: "Generar Lista de Problemas",
      generateIssueListSubtitle: "Crear una lista completa de problemas identificados",
      summarizeNegotiationPositions: "Resumir Posiciones de Negociación",
      summarizeNegotiationPositionsSubtitle: "Extraer y resumir puntos clave de negociación",
      redaction: "Redacción",
      redactionSubtitle: "Seleccionar y redactar texto sensible del documento",
      disabledReasonRunReviewFirst: "Ejecute Revisión primero para detectar problemas",
    },
    vault: {
      library: "Biblioteca",
      standards: "Estándares",
      precedent: "Precedente",
      playbook: "Guía",
      organizationAssets: "ACTIVOS DE LA ORGANIZACIÓN",
      legalKnowledge: "CONOCIMIENTO LEGAL",
      projectLibrary: "Biblioteca de Proyectos",
      projectLibrarySubtitle: "Accede a todos tus documentos de proyecto",
      complianceRules: "Reglas de Cumplimiento",
      complianceRulesSubtitle: "Gestionar reglas de cumplimiento regulatorio",
      playbookLibrary: "Biblioteca de Guías",
      playbookLibrarySubtitle: "Accede a todas tus guías",
      clausesPrecedents: "Cláusulas y Precedentes",
      clausesPrecedentsSubtitle: "Explorar y gestionar cláusulas estándar",
      importExternalResources: "Importar Recursos Externos",
      importExternalResourcesSubtitle: "Agregar documentos y recursos externos",
    },
    history: {
      title: "Historial",
      all: "Todo",
      review: "Revisar",
      draft: "Borrador",
      playbook: "Guía",
      precedent: "Precedente",
      noActivities: "Aún no hay actividades",
      noActivitiesSubtitle: "Tus actividades recientes aparecerán aquí",
      loadingActivities: "Cargando actividades...",
    },
    setup: {
      accountIdentity: "CUENTA E IDENTIDAD",
      systemPreferences: "PREFERENCIAS DEL SISTEMA",
      resources: "RECURSOS",
      personalProfile: "Perfil Personal",
      sharingTeam: "Compartir y Equipo",
      manageAccess: "GESTIONAR ACCESO",
      billingPlan: "Facturación y Plan",
      language: "Idioma",
      redactionMasking: "Redacción y Enmascaramiento",
      privacyControls: "CONTROLES DE PRIVACIDAD",
      emailNotifications: "Notificaciones por Correo",
      emailNotificationsSubtitle: "RECIBIR ACTUALIZACIONES POR CORREO",
      changePassword: "Cambiar Contraseña",
      changePasswordSubtitle: "ACTUALIZAR TU CONTRASEÑA",
      helpDocumentation: "Ayuda y Documentación",
      helpDocumentationSubtitle: "GUÍAS Y SOPORTE",
      logOut: "Cerrar Sesión",
    },
    language: {
      title: "Idioma",
      english: "Inglés",
      chinese: "Chino",
      spanish: "Español",
      french: "Francés",
      japanese: "Japonés",
      german: "Alemán",
    },
    profile: {
      title: "Perfil",
      emailAddress: "DIRECCIÓN DE CORREO",
      accountId: "ID DE CUENTA",
      signOut: "CERRAR SESIÓN",
    },
    sharing: {
      title: "Compartir",
      activeTeamAccess: "ACCESO ACTIVO DEL EQUIPO",
      inviteMember: "INVITAR MIEMBRO",
      partner: "SOCIOS",
      juniorAssociate: "ASOCIADO JUNIOR",
    },
    helpSupport: {
      title: "Ayuda y Soporte",
      userGuide: "Guía de Usuario",
      tutorials: "TUTORIALES",
      supportChat: "Chat de Soporte",
      concierge247: "CONSERJE 24/7",
      termsOfService: "Términos de Servicio",
      privacyPolicy: "Política de Privacidad",
      faq: "Preguntas Frecuentes",
      contactSupport: "Contactar Soporte",
      legalPolicies: "LEGAL Y POLÍTICAS",
    },
    translationPage: {
      sourceLanguage: "IDIOMA DE ORIGEN",
      targetLanguage: "IDIOMA DE DESTINO",
      translationMode: "MODO DE TRADUCCIÓN",
      selectedText: "TEXTO SELECCIONADO",
      translatedText: "TEXTO TRADUCIDO",
      insertBelow: "Insertar Abajo",
      insertAbove: "Insertar Arriba",
      replaceText: "Reemplazar Texto",
      refreshSelection: "Actualizar Selección",
      translate: "Traducir",
      translating: "Traduciendo...",
      noTextSelected: "No hay texto seleccionado. Por favor seleccione texto en el documento.",
      loadingSelectedText: "Cargando texto seleccionado...",
      translationApplied: "¡Traducción aplicada exitosamente!",
    },
    contextMenu: {
      selectedText: "Texto Seleccionado",
      askAI: "Preguntar a IA",
      saveClause: "Guardar como Cláusula",
      autoComment: "Comentario Automático",
      checkCompliance: "Verificar Cumplimiento",
      loading: "Detectando selección...",
      clauseText: "Texto de Cláusula",
      clauseName: "Nombre de Cláusula",
      clauseNamePlaceholder: "Ingrese el nombre de la cláusula",
      category: "Categoría",
      categoryPlaceholder: "ej., Confidencialidad, Terminación",
      tags: "Etiquetas",
      tagsPlaceholder: "Etiquetas separadas por comas",
      description: "Descripción",
      descriptionPlaceholder: "Descripción opcional",
    },
    negotiationPage: {
      title: "Negociación",
      selectPosition: "SELECCIONAR POSICIÓN",
      positionBuyer: "Comprador",
      positionSeller: "Vendedor",
      positionLessor: "Arrendador",
      positionLessee: "Arrendatario",
      positionLicensor: "Licenciante",
      positionLicensee: "Licenciatario",
      positionEmployer: "Empleador",
      positionEmployee: "Empleado",
      positionCustom: "Personalizado",
      customPositionPlaceholder: "Ingrese su posición",
      customPositionRequired: "Ingrese su posición personalizada",
      negotiationInstructions: "INSTRUCCIONES DE NEGOCIACIÓN",
      instructionPlaceholder: "Agregar punto de negociación o instrucción...",
      textScope: "ALCANCE DEL TEXTO",
      selectedText: "Texto Seleccionado",
      wholeDocument: "Documento Completo",
      loadingText: "Cargando texto seleccionado...",
      refreshSelection: "Actualizar",
      noTextSelected: "No hay texto seleccionado. Por favor seleccione texto en el documento.",
      referenceLibrary: "BIBLIOTECA DE REFERENCIA (OPCIONAL)",
      noReference: "Sin Referencia",
      clauseLibrary: "Biblioteca de Cláusulas",
      playbookLibrary: "Biblioteca de Playbooks",
      vaultProject: "Proyecto de Bóveda",
      selectReference: "Seleccionar Referencia",
      noClauses: "No hay cláusulas disponibles",
      noPlaybooks: "No hay playbooks disponibles",
      noProjects: "No hay proyectos disponibles",
      parsingDocument: "Analizando documento...",
      loadingReferences: "Cargando referencias...",
      analyzing: "Analizando puntos de negociación...",
      completing: "Completando...",
      success: "Análisis de Negociación Completo",
      successDescription: "Se han generado enmiendas sugeridas",
      error: "Error",
      runAnalysis: "Ejecutar Análisis de Negociación",
      suggestedAmendments: "Enmiendas Sugeridas",
      noInstructions: "Por favor agregue al menos una instrucción de negociación",
      addInstruction: "Agregar",
    },
    clauseLibrary: {
      title: "Biblioteca de Cláusulas",
      loading: "Cargando cláusulas...",
      noClauses: "No se encontraron cláusulas. ¡Cree su primera cláusula para comenzar!",
      createClause: "Crear Cláusula",
      editClause: "Editar Cláusula",
      deleteClause: "Eliminar Cláusula",
      deleteClauseConfirm: "¿Está seguro de que desea eliminar",
      deleteClauseWarning: " Esta acción no se puede deshacer.",
      clauseDeleted: "Cláusula Eliminada",
      clauseDeletedDescription: "La cláusula se ha eliminado exitosamente",
      clauseDuplicated: "Cláusula Duplicada",
      clauseDuplicatedDescription: "La cláusula se ha duplicado exitosamente",
      viewClause: "Ver Cláusula",
      clauseName: "Nombre de Cláusula",
      clauseNamePlaceholder: "Ingrese el nombre de la cláusula",
      clauseText: "Texto de Cláusula",
      clauseTextPlaceholder: "Ingrese el texto de la cláusula o cargue desde la selección",
      category: "Categoría",
      categoryPlaceholder: "ej., Confidencialidad, Terminación",
      tags: "Etiquetas",
      tagsPlaceholder: "Etiquetas separadas por comas",
      description: "Descripción",
      descriptionPlaceholder: "Descripción opcional",
      validationError: "El nombre y el texto son requeridos",
      loadSelection: "Cargar Selección",
      loadSelectionHint: "Seleccione texto en el documento y haga clic en 'Cargar Selección'",
      loadingSelection: "Cargando...",
      error: "Error",
    },
  },
  fr: {
    common: {
      back: "Retour",
      add: "Ajouter",
      cancel: "Annuler",
      confirm: "Confirmer",
      save: "Enregistrer",
      saving: "Enregistrement...",
      delete: "Supprimer",
      edit: "Modifier",
      close: "Fermer",
      loading: "Chargement...",
      error: "Erreur",
      retry: "Réessayer",
      ask: "Demander",
    },
    nav: {
      dashboard: "TABLEAU DE BORD",
      vault: "COFFRE",
      history: "HISTORIQUE",
      setup: "PARAMÈTRES",
    },
    dashboard: {
      review: "Réviser",
      draft: "Brouillon",
      understandChanges: "COMPRENDRE LES MODIFICATIONS",
      analysisStrategy: "ANALYSE ET STRATÉGIE",
      summariseRedlines: "Résumer les Modifications",
      summariseRedlinesSubtitle: "Résumé exécutif des modifications",
      understandRedlines: "Comprendre les Modifications",
      understandRedlinesSubtitle: "Analyser les modifications suivies",
      playbookReview: "Révision du Guide",
      playbookReviewSubtitle: "Réviser le contrat selon les normes de l'entreprise",
      precedentReview: "Révision des Précédents",
      precedentReviewSubtitle: "Comparer aux normes des accords précédents",
      generalReview: "Révision Générale",
      generalReviewSubtitle: "Vérification standard de conformité et de risque",
      checkDefinitions: "Vérifier les Définitions",
      checkDefinitionsSubtitle: "Valider l'utilisation cohérente des termes définis",
      negotiation: "Négociation",
      negotiationSubtitle: "Conseil stratégique pour les termes de la contrepartie",
      translation: "Traduction",
      translationSubtitle: "Traduire le texte juridique dans d'autres langues",
      draftClause: "Rédiger une Clause",
      draftClauseSubtitle: "Générer un langage contractuel spécifique",
      completeParagraph: "Compléter le Paragraphe",
      completeParagraphSubtitle: "Développer le texte existant avec l'IA",
      fullDocument: "Document Complet",
      fullDocumentSubtitle: "Créer un document entier à partir d'une invite",
      createTable: "Créer un Tableau",
      createTableSubtitle: "Générer des tableaux pour les données ou résumés",
      formFiller: "Remplisseur de Formulaire",
      formFillerSubtitle: "Remplir automatiquement les formulaires et modèles",
      draftFromScratch: "Rédiger à partir de Zéro",
      draftFromScratchSubtitle: "Créer un nouveau contenu juridique à partir de zéro",
      redomicile: "Redomicilier / Re-localiser",
      redomicileSubtitle: "Adapter les documents juridiques pour différentes juridictions",
      generateIssueList: "Générer une Liste de Problèmes",
      generateIssueListSubtitle: "Créer une liste complète des problèmes identifiés",
      summarizeNegotiationPositions: "Résumer les Positions de Négociation",
      summarizeNegotiationPositionsSubtitle: "Extraire et résumer les points clés de négociation",
      redaction: "Rédaction",
      redactionSubtitle: "Sélectionner et masquer le texte sensible du document",
      disabledReasonRunReviewFirst: "Exécutez d'abord la Révision pour détecter les problèmes",
    },
    vault: {
      library: "Bibliothèque",
      standards: "Normes",
      precedent: "Précédent",
      playbook: "Guide",
      organizationAssets: "ACTIFS DE L'ORGANISATION",
      legalKnowledge: "CONNAISSANCE JURIDIQUE",
      projectLibrary: "Bibliothèque de Projets",
      projectLibrarySubtitle: "Accéder à tous vos documents de projet",
      complianceRules: "Règles de Conformité",
      complianceRulesSubtitle: "Gérer les règles de conformité réglementaire",
      playbookLibrary: "Bibliothèque de Guides",
      playbookLibrarySubtitle: "Accéder à tous vos guides",
      clausesPrecedents: "Clauses et Précédents",
      clausesPrecedentsSubtitle: "Parcourir et gérer les clauses standard",
      importExternalResources: "Importer des Ressources Externes",
      importExternalResourcesSubtitle: "Ajouter des documents et ressources externes",
    },
    history: {
      title: "Historique",
      all: "Tout",
      review: "Réviser",
      draft: "Brouillon",
      playbook: "Guide",
      precedent: "Précédent",
      noActivities: "Aucune activité pour le moment",
      noActivitiesSubtitle: "Vos activités récentes apparaîtront ici",
      loadingActivities: "Chargement des activités...",
    },
    setup: {
      accountIdentity: "COMPTE ET IDENTITÉ",
      systemPreferences: "PRÉFÉRENCES SYSTÈME",
      resources: "RESSOURCES",
      personalProfile: "Profil Personnel",
      sharingTeam: "Partage et Équipe",
      manageAccess: "GÉRER L'ACCÈS",
      billingPlan: "Facturation et Plan",
      language: "Langue",
      redactionMasking: "Rédaction et Masquage",
      privacyControls: "CONTRÔLES DE CONFIDENTIALITÉ",
      emailNotifications: "Notifications par E-mail",
      emailNotificationsSubtitle: "RECEVOIR DES MISES À JOUR PAR E-MAIL",
      changePassword: "Changer le Mot de Passe",
      changePasswordSubtitle: "METTRE À JOUR VOTRE MOT DE PASSE",
      helpDocumentation: "Aide et Documentation",
      helpDocumentationSubtitle: "GUIDES ET SUPPORT",
      logOut: "Déconnexion",
    },
    language: {
      title: "Langue",
      english: "Anglais",
      chinese: "Chinois",
      spanish: "Espagnol",
      french: "Français",
      japanese: "Japonais",
      german: "Allemand",
    },
    profile: {
      title: "Profil",
      emailAddress: "ADRESSE E-MAIL",
      accountId: "ID DE COMPTE",
      signOut: "DÉCONNEXION",
    },
    sharing: {
      title: "Partage",
      activeTeamAccess: "ACCÈS ACTIF DE L'ÉQUIPE",
      inviteMember: "INVITER UN MEMBRE",
      partner: "PARTENAIRE",
      juniorAssociate: "ASSOCIÉ JUNIOR",
    },
    helpSupport: {
      title: "Aide et Support",
      userGuide: "Guide de l'Utilisateur",
      tutorials: "TUTORIELS",
      supportChat: "Chat de Support",
      concierge247: "CONCIERGE 24/7",
      termsOfService: "Conditions d'Utilisation",
      privacyPolicy: "Politique de Confidentialité",
      faq: "FAQ",
      contactSupport: "Contacter le Support",
      legalPolicies: "JURIDIQUE ET POLITIQUES",
    },
    translationPage: {
      sourceLanguage: "LANGUE SOURCE",
      targetLanguage: "LANGUE CIBLE",
      translationMode: "MODE DE TRADUCTION",
      selectedText: "TEXTE SÉLECTIONNÉ",
      translatedText: "TEXTE TRADUIT",
      insertBelow: "Insérer en Dessous",
      insertAbove: "Insérer au Dessus",
      replaceText: "Remplacer le Texte",
      refreshSelection: "Actualiser la Sélection",
      translate: "Traduire",
      translating: "Traduction en cours...",
      noTextSelected: "Aucun texte sélectionné. Veuillez sélectionner du texte dans le document.",
      loadingSelectedText: "Chargement du texte sélectionné...",
      translationApplied: "Traduction appliquée avec succès !",
    },
    contextMenu: {
      selectedText: "Texte Sélectionné",
      askAI: "Demander à l'IA",
      saveClause: "Enregistrer comme Clause",
      autoComment: "Commentaire Automatique",
      checkCompliance: "Vérifier la Conformité",
      loading: "Détection de la sélection...",
      clauseText: "Texte de la Clause",
      clauseName: "Nom de la Clause",
      clauseNamePlaceholder: "Entrez le nom de la clause",
      category: "Catégorie",
      categoryPlaceholder: "ex., Confidentialité, Résiliation",
      tags: "Étiquettes",
      tagsPlaceholder: "Étiquettes séparées par des virgules",
      description: "Description",
      descriptionPlaceholder: "Description optionnelle",
    },
    negotiationPage: {
      title: "Négociation",
      selectPosition: "SÉLECTIONNER LA POSITION",
      positionBuyer: "Acheteur",
      positionSeller: "Vendeur",
      positionLessor: "Bailleur",
      positionLessee: "Locataire",
      positionLicensor: "Concédant",
      positionLicensee: "Concessionnaire",
      positionEmployer: "Employeur",
      positionEmployee: "Employé",
      positionCustom: "Personnalisé",
      customPositionPlaceholder: "Entrez votre position",
      customPositionRequired: "Entrez votre position personnalisée",
      negotiationInstructions: "INSTRUCTIONS DE NÉGOCIATION",
      instructionPlaceholder: "Ajouter un point de négociation ou une instruction...",
      textScope: "PORTÉE DU TEXTE",
      selectedText: "Texte Sélectionné",
      wholeDocument: "Document Entier",
      loadingText: "Chargement du texte sélectionné...",
      refreshSelection: "Actualiser",
      noTextSelected: "Aucun texte sélectionné. Veuillez sélectionner du texte dans le document.",
      referenceLibrary: "BIBLIOTHÈQUE DE RÉFÉRENCE (OPTIONNEL)",
      noReference: "Aucune Référence",
      clauseLibrary: "Bibliothèque de Clauses",
      playbookLibrary: "Bibliothèque de Playbooks",
      vaultProject: "Projet de Coffre",
      selectReference: "Sélectionner une Référence",
      noClauses: "Aucune clause disponible",
      noPlaybooks: "Aucun playbook disponible",
      noProjects: "Aucun projet disponible",
      parsingDocument: "Analyse du document...",
      loadingReferences: "Chargement des références...",
      analyzing: "Analyse des points de négociation...",
      completing: "Finalisation...",
      success: "Analyse de Négociation Terminée",
      successDescription: "Des amendements suggérés ont été générés",
      error: "Erreur",
      runAnalysis: "Exécuter l'Analyse de Négociation",
      suggestedAmendments: "Amendements Suggérés",
      noInstructions: "Veuillez ajouter au moins une instruction de négociation",
      addInstruction: "Ajouter",
    },
    clauseLibrary: {
      title: "Bibliothèque de Clauses",
      loading: "Chargement des clauses...",
      noClauses: "Aucune clause trouvée. Créez votre première clause pour commencer !",
      createClause: "Créer une Clause",
      editClause: "Modifier la Clause",
      deleteClause: "Supprimer la Clause",
      deleteClauseConfirm: "Êtes-vous sûr de vouloir supprimer",
      deleteClauseWarning: " Cette action ne peut pas être annulée.",
      clauseDeleted: "Clause Supprimée",
      clauseDeletedDescription: "La clause a été supprimée avec succès",
      clauseDuplicated: "Clause Dupliquée",
      clauseDuplicatedDescription: "La clause a été dupliquée avec succès",
      viewClause: "Voir la Clause",
      clauseName: "Nom de la Clause",
      clauseNamePlaceholder: "Entrez le nom de la clause",
      clauseText: "Texte de la Clause",
      clauseTextPlaceholder: "Entrez le texte de la clause ou chargez depuis la sélection",
      category: "Catégorie",
      categoryPlaceholder: "ex., Confidentialité, Résiliation",
      tags: "Étiquettes",
      tagsPlaceholder: "Étiquettes séparées par des virgules",
      description: "Description",
      descriptionPlaceholder: "Description optionnelle",
      validationError: "Le nom et le texte sont requis",
      loadSelection: "Charger la Sélection",
      loadSelectionHint: "Sélectionnez du texte dans le document et cliquez sur 'Charger la Sélection'",
      loadingSelection: "Chargement...",
      error: "Erreur",
    },
  },
  ja: {
    common: {
      back: "戻る",
      add: "追加",
      cancel: "キャンセル",
      confirm: "確認",
      save: "保存",
      saving: "保存中...",
      delete: "削除",
      edit: "編集",
      close: "閉じる",
      loading: "読み込み中...",
      error: "エラー",
      retry: "再試行",
      ask: "質問",
    },
    nav: {
      dashboard: "ダッシュボード",
      vault: "保管庫",
      history: "履歴",
      setup: "設定",
    },
    dashboard: {
      review: "レビュー",
      draft: "ドラフト",
      understandChanges: "変更を理解する",
      analysisStrategy: "分析と戦略",
      summariseRedlines: "修正を要約",
      summariseRedlinesSubtitle: "変更のエグゼクティブサマリー",
      understandRedlines: "修正を理解",
      understandRedlinesSubtitle: "追跡された変更を分析",
      playbookReview: "プレイブックレビュー",
      playbookReviewSubtitle: "会社基準に対して契約をレビュー",
      precedentReview: "先例レビュー",
      precedentReviewSubtitle: "以前の取引基準と比較",
      generalReview: "一般レビュー",
      generalReviewSubtitle: "標準的なコンプライアンスとリスクチェック",
      checkDefinitions: "定義を確認",
      checkDefinitionsSubtitle: "定義された用語の一貫した使用を検証",
      negotiation: "交渉",
      negotiationSubtitle: "相手方の条件に対する戦略的アドバイス",
      translation: "翻訳",
      translationSubtitle: "法的テキストを他の言語に翻訳",
      draftClause: "条項を起草",
      draftClauseSubtitle: "特定の契約言語を生成",
      completeParagraph: "段落を完成",
      completeParagraphSubtitle: "AIで既存のテキストを拡張",
      fullDocument: "完全な文書",
      fullDocumentSubtitle: "プロンプトから文書全体を作成",
      createTable: "テーブルを作成",
      createTableSubtitle: "データや要約のテーブルを生成",
      formFiller: "フォームフィラー",
      formFillerSubtitle: "フォームとテンプレートを自動入力",
      draftFromScratch: "ゼロから起草",
      draftFromScratchSubtitle: "空白から新しい法的コンテンツを作成",
      redomicile: "再登録/再ローカライズ",
      redomicileSubtitle: "異なる管轄区域に対応する法的文書を適応",
      generateIssueList: "問題リストを生成",
      generateIssueListSubtitle: "特定された問題の包括的なリストを作成",
      summarizeNegotiationPositions: "交渉立場を要約",
      summarizeNegotiationPositionsSubtitle: "主要な交渉ポイントを抽出して要約",
      redaction: "墨消し",
      redactionSubtitle: "文書内の機密テキストを選択して墨消し",
      disabledReasonRunReviewFirst: "問題を検出するには、まずレビューを実行してください",
    },
    vault: {
      library: "ライブラリ",
      standards: "標準",
      precedent: "先例",
      playbook: "プレイブック",
      organizationAssets: "組織資産",
      legalKnowledge: "法的知識",
      projectLibrary: "プロジェクトライブラリ",
      projectLibrarySubtitle: "すべてのプロジェクト文書にアクセス",
      complianceRules: "コンプライアンスルール",
      complianceRulesSubtitle: "規制コンプライアンスルールを管理",
      playbookLibrary: "プレイブックライブラリ",
      playbookLibrarySubtitle: "すべてのプレイブックにアクセス",
      clausesPrecedents: "条項と先例",
      clausesPrecedentsSubtitle: "標準条項を閲覧および管理",
      importExternalResources: "外部リソースをインポート",
      importExternalResourcesSubtitle: "外部文書とリソースを追加",
    },
    history: {
      title: "履歴",
      all: "すべて",
      review: "レビュー",
      draft: "ドラフト",
      playbook: "プレイブック",
      precedent: "先例",
      noActivities: "アクティビティはまだありません",
      noActivitiesSubtitle: "最近のアクティビティがここに表示されます",
      loadingActivities: "アクティビティを読み込み中...",
    },
    setup: {
      accountIdentity: "アカウントとアイデンティティ",
      systemPreferences: "システム設定",
      resources: "リソース",
      personalProfile: "個人プロフィール",
      sharingTeam: "共有とチーム",
      manageAccess: "アクセスを管理",
      billingPlan: "請求とプラン",
      language: "言語",
      redactionMasking: "編集とマスキング",
      privacyControls: "プライバシーコントロール",
      emailNotifications: "メール通知",
      emailNotificationsSubtitle: "メールで更新を受信",
      changePassword: "パスワードを変更",
      changePasswordSubtitle: "パスワードを更新",
      helpDocumentation: "ヘルプとドキュメント",
      helpDocumentationSubtitle: "ガイドとサポート",
      logOut: "ログアウト",
    },
    language: {
      title: "言語",
      english: "英語",
      chinese: "中国語",
      spanish: "スペイン語",
      french: "フランス語",
      japanese: "日本語",
      german: "ドイツ語",
    },
    profile: {
      title: "プロフィール",
      emailAddress: "メールアドレス",
      accountId: "アカウントID",
      signOut: "サインアウト",
    },
    sharing: {
      title: "共有",
      activeTeamAccess: "アクティブなチームアクセス",
      inviteMember: "メンバーを招待",
      partner: "パートナー",
      juniorAssociate: "ジュニアアソシエイト",
    },
    helpSupport: {
      title: "ヘルプとサポート",
      userGuide: "ユーザーガイド",
      tutorials: "チュートリアル",
      supportChat: "サポートチャット",
      concierge247: "24/7コンシェルジュ",
      termsOfService: "利用規約",
      privacyPolicy: "プライバシーポリシー",
      faq: "よくある質問",
      contactSupport: "サポートに連絡",
      legalPolicies: "法的およびポリシー",
    },
    translationPage: {
      sourceLanguage: "ソース言語",
      targetLanguage: "ターゲット言語",
      translationMode: "翻訳モード",
      selectedText: "選択されたテキスト",
      translatedText: "翻訳されたテキスト",
      insertBelow: "下に挿入",
      insertAbove: "上に挿入",
      replaceText: "テキストを置換",
      refreshSelection: "選択を更新",
      translate: "翻訳",
      translating: "翻訳中...",
      noTextSelected: "テキストが選択されていません。ドキュメントでテキストを選択してください。",
      loadingSelectedText: "選択されたテキストを読み込み中...",
      translationApplied: "翻訳が正常に適用されました！",
    },
    contextMenu: {
      selectedText: "選択されたテキスト",
      askAI: "AIに質問",
      saveClause: "条項として保存",
      autoComment: "自動コメント",
      checkCompliance: "コンプライアンスを確認",
      loading: "選択を検出中...",
      clauseText: "条項テキスト",
      clauseName: "条項名",
      clauseNamePlaceholder: "条項名を入力",
      category: "カテゴリ",
      categoryPlaceholder: "例：機密性、終了",
      tags: "タグ",
      tagsPlaceholder: "カンマ区切りのタグ",
      description: "説明",
      descriptionPlaceholder: "オプションの説明",
    },
    negotiationPage: {
      title: "交渉",
      selectPosition: "立場を選択",
      positionBuyer: "買い手",
      positionSeller: "売り手",
      positionLessor: "貸主",
      positionLessee: "借主",
      positionLicensor: "ライセンサー",
      positionLicensee: "ライセンシー",
      positionEmployer: "雇用主",
      positionEmployee: "従業員",
      positionCustom: "カスタム",
      customPositionPlaceholder: "あなたの立場を入力",
      customPositionRequired: "カスタムの立場を入力してください",
      negotiationInstructions: "交渉指示",
      instructionPlaceholder: "交渉ポイントまたは指示を追加...",
      textScope: "テキスト範囲",
      selectedText: "選択されたテキスト",
      wholeDocument: "ドキュメント全体",
      loadingText: "選択されたテキストを読み込み中...",
      refreshSelection: "更新",
      noTextSelected: "テキストが選択されていません。ドキュメントでテキストを選択してください。",
      referenceLibrary: "参照ライブラリ（オプション）",
      noReference: "参照なし",
      clauseLibrary: "条項ライブラリ",
      playbookLibrary: "プレイブックライブラリ",
      vaultProject: "保管庫プロジェクト",
      selectReference: "参照を選択",
      noClauses: "利用可能な条項がありません",
      noPlaybooks: "利用可能なプレイブックがありません",
      noProjects: "利用可能なプロジェクトがありません",
      parsingDocument: "ドキュメントを解析中...",
      loadingReferences: "参照を読み込み中...",
      analyzing: "交渉ポイントを分析中...",
      completing: "完了中...",
      success: "交渉分析完了",
      successDescription: "推奨修正が生成されました",
      error: "エラー",
      runAnalysis: "交渉分析を実行",
      suggestedAmendments: "推奨修正",
      noInstructions: "少なくとも1つの交渉指示を追加してください",
      addInstruction: "追加",
    },
    clauseLibrary: {
      title: "条項ライブラリ",
      loading: "条項を読み込み中...",
      noClauses: "条項が見つかりません。最初の条項を作成して始めましょう！",
      createClause: "条項を作成",
      editClause: "条項を編集",
      deleteClause: "条項を削除",
      deleteClauseConfirm: "削除してもよろしいですか",
      deleteClauseWarning: "この操作は元に戻せません。",
      clauseDeleted: "条項が削除されました",
      clauseDeletedDescription: "条項が正常に削除されました",
      clauseDuplicated: "条項が複製されました",
      clauseDuplicatedDescription: "条項が正常に複製されました",
      viewClause: "条項を表示",
      clauseName: "条項名",
      clauseNamePlaceholder: "条項名を入力",
      clauseText: "条項テキスト",
      clauseTextPlaceholder: "条項テキストを入力するか、選択から読み込む",
      category: "カテゴリ",
      categoryPlaceholder: "例：機密性、終了",
      tags: "タグ",
      tagsPlaceholder: "カンマ区切りのタグ",
      description: "説明",
      descriptionPlaceholder: "オプションの説明",
      validationError: "名前とテキストは必須です",
      loadSelection: "選択を読み込む",
      loadSelectionHint: "ドキュメントでテキストを選択し、「選択を読み込む」をクリック",
      loadingSelection: "読み込み中...",
      error: "エラー",
    },
  },
  de: {
    common: {
      back: "Zurück",
      add: "Hinzufügen",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      save: "Speichern",
      saving: "Speichern...",
      delete: "Löschen",
      edit: "Bearbeiten",
      close: "Schließen",
      loading: "Laden...",
      error: "Fehler",
      retry: "Wiederholen",
      ask: "Fragen",
    },
    nav: {
      dashboard: "DASHBOARD",
      vault: "TRESOR",
      history: "VERLAUF",
      setup: "EINSTELLUNGEN",
    },
    dashboard: {
      review: "Überprüfen",
      draft: "Entwurf",
      understandChanges: "ÄNDERUNGEN VERSTEHEN",
      analysisStrategy: "ANALYSE & STRATEGIE",
      summariseRedlines: "Änderungen zusammenfassen",
      summariseRedlinesSubtitle: "Zusammenfassung der Änderungen",
      understandRedlines: "Änderungen verstehen",
      understandRedlinesSubtitle: "Verfolgte Änderungen analysieren",
      playbookReview: "Playbook-Überprüfung",
      playbookReviewSubtitle: "Vertrag nach Unternehmensstandards überprüfen",
      precedentReview: "Präzedenzfall-Überprüfung",
      precedentReviewSubtitle: "Mit vorherigen Deal-Standards vergleichen",
      generalReview: "Allgemeine Überprüfung",
      generalReviewSubtitle: "Standard-Compliance- und Risikoprüfung",
      checkDefinitions: "Definitionen prüfen",
      checkDefinitionsSubtitle: "Konsistente Verwendung definierter Begriffe validieren",
      negotiation: "Verhandlung",
      negotiationSubtitle: "Strategische Beratung für Gegenpartei-Bedingungen",
      translation: "Übersetzung",
      translationSubtitle: "Rechtstext in andere Sprachen übersetzen",
      draftClause: "Klausel entwerfen",
      draftClauseSubtitle: "Spezifische Vertragssprache generieren",
      completeParagraph: "Absatz vervollständigen",
      completeParagraphSubtitle: "Vorhandenen Text mit KI erweitern",
      fullDocument: "Vollständiges Dokument",
      fullDocumentSubtitle: "Ganzes Dokument aus einer Eingabeaufforderung erstellen",
      createTable: "Tabelle erstellen",
      createTableSubtitle: "Tabellen für Daten oder Zusammenfassungen generieren",
      formFiller: "Formularausfüller",
      formFillerSubtitle: "Formulare und Vorlagen automatisch ausfüllen",
      draftFromScratch: "Von Grund auf Entwerfen",
      draftFromScratchSubtitle: "Neue rechtliche Inhalte von Grund auf erstellen",
      redomicile: "Umdomizilieren / Neu Lokalisieren",
      redomicileSubtitle: "Rechtliche Dokumente für verschiedene Gerichtsbarkeiten anpassen",
      generateIssueList: "Problemliste Generieren",
      generateIssueListSubtitle: "Eine umfassende Liste identifizierter Probleme erstellen",
      summarizeNegotiationPositions: "Verhandlungspositionen Zusammenfassen",
      summarizeNegotiationPositionsSubtitle: "Wichtige Verhandlungspunkte extrahieren und zusammenfassen",
      redaction: "Schwärzung",
      redactionSubtitle: "Sensiblen Text im Dokument auswählen und schwärzen",
      disabledReasonRunReviewFirst: "Führen Sie zuerst eine Überprüfung durch, um Probleme zu erkennen",
    },
    vault: {
      library: "Bibliothek",
      standards: "Standards",
      precedent: "Präzedenzfall",
      playbook: "Playbook",
      organizationAssets: "ORGANISATIONSAKTIVA",
      legalKnowledge: "RECHTLICHES WISSEN",
      projectLibrary: "Projektbibliothek",
      projectLibrarySubtitle: "Auf alle Ihre Projektdokumente zugreifen",
      complianceRules: "Compliance-Regeln",
      complianceRulesSubtitle: "Regulatorische Compliance-Regeln verwalten",
      playbookLibrary: "Playbook-Bibliothek",
      playbookLibrarySubtitle: "Auf alle Ihre Playbooks zugreifen",
      clausesPrecedents: "Klauseln & Präzedenzfälle",
      clausesPrecedentsSubtitle: "Standardklauseln durchsuchen und verwalten",
      importExternalResources: "Externe Ressourcen importieren",
      importExternalResourcesSubtitle: "Externe Dokumente und Ressourcen hinzufügen",
    },
    history: {
      title: "Verlauf",
      all: "Alle",
      review: "Überprüfen",
      draft: "Entwurf",
      playbook: "Playbook",
      precedent: "Präzedenzfall",
      noActivities: "Noch keine Aktivitäten",
      noActivitiesSubtitle: "Ihre letzten Aktivitäten werden hier angezeigt",
      loadingActivities: "Aktivitäten werden geladen...",
    },
    setup: {
      accountIdentity: "KONTO & IDENTITÄT",
      systemPreferences: "SYSTEMEINSTELLUNGEN",
      resources: "RESSOURCEN",
      personalProfile: "Persönliches Profil",
      sharingTeam: "Teilen & Team",
      manageAccess: "ZUGRIFF VERWALTEN",
      billingPlan: "Abrechnung & Plan",
      language: "Sprache",
      redactionMasking: "Redaktion & Maskierung",
      privacyControls: "DATENSCHUTZSTEUERUNGEN",
      emailNotifications: "E-Mail-Benachrichtigungen",
      emailNotificationsSubtitle: "UPDATES PER E-MAIL ERHALTEN",
      changePassword: "Passwort ändern",
      changePasswordSubtitle: "IHR PASSWORT AKTUALISIEREN",
      helpDocumentation: "Hilfe & Dokumentation",
      helpDocumentationSubtitle: "ANLEITUNGEN & SUPPORT",
      logOut: "Abmelden",
    },
    language: {
      title: "Sprache",
      english: "Englisch",
      chinese: "Chinesisch",
      spanish: "Spanisch",
      french: "Französisch",
      japanese: "Japanisch",
      german: "Deutsch",
    },
    profile: {
      title: "Profil",
      emailAddress: "E-MAIL-ADRESSE",
      accountId: "KONTO-ID",
      signOut: "ABMELDEN",
    },
    sharing: {
      title: "Teilen",
      activeTeamAccess: "AKTIVER TEAMZUGRIFF",
      inviteMember: "MITGLIED EINLADEN",
      partner: "PARTNER",
      juniorAssociate: "JUNIOR-ASSOCIATE",
    },
    helpSupport: {
      title: "Hilfe & Support",
      userGuide: "Benutzerhandbuch",
      tutorials: "TUTORIALS",
      supportChat: "Support-Chat",
      concierge247: "24/7 CONCIERGE",
      termsOfService: "Nutzungsbedingungen",
      privacyPolicy: "Datenschutzrichtlinie",
      faq: "FAQ",
      contactSupport: "Support Kontaktieren",
      legalPolicies: "RECHTLICHES & RICHTLINIEN",
    },
    translationPage: {
      sourceLanguage: "QUELLSPRACHE",
      targetLanguage: "ZIELSPRACHE",
      translationMode: "ÜBERSETZUNGSMODUS",
      selectedText: "AUSGEWÄHLTER TEXT",
      translatedText: "ÜBERSETZTER TEXT",
      insertBelow: "Darunter Einfügen",
      insertAbove: "Darüber Einfügen",
      replaceText: "Text Ersetzen",
      refreshSelection: "Auswahl Aktualisieren",
      translate: "Übersetzen",
      translating: "Übersetzen...",
      noTextSelected: "Kein Text ausgewählt. Bitte wählen Sie Text im Dokument aus.",
      loadingSelectedText: "Ausgewählten Text laden...",
      translationApplied: "Übersetzung erfolgreich angewendet!",
    },
    contextMenu: {
      selectedText: "Ausgewählter Text",
      askAI: "KI Fragen",
      saveClause: "Als Klausel Speichern",
      autoComment: "Automatischer Kommentar",
      checkCompliance: "Compliance Prüfen",
      loading: "Auswahl wird erkannt...",
      clauseText: "Klauseltext",
      clauseName: "Klauselname",
      clauseNamePlaceholder: "Klauselname eingeben",
      category: "Kategorie",
      categoryPlaceholder: "z.B. Vertraulichkeit, Kündigung",
      tags: "Tags",
      tagsPlaceholder: "Kommagetrennte Tags",
      description: "Beschreibung",
      descriptionPlaceholder: "Optionale Beschreibung",
    },
    negotiationPage: {
      title: "Verhandlung",
      selectPosition: "POSITION AUSWÄHLEN",
      positionBuyer: "Käufer",
      positionSeller: "Verkäufer",
      positionLessor: "Vermieter",
      positionLessee: "Mieter",
      positionLicensor: "Lizenzgeber",
      positionLicensee: "Lizenznehmer",
      positionEmployer: "Arbeitgeber",
      positionEmployee: "Arbeitnehmer",
      positionCustom: "Benutzerdefiniert",
      customPositionPlaceholder: "Geben Sie Ihre Position ein",
      customPositionRequired: "Bitte geben Sie Ihre benutzerdefinierte Position ein",
      negotiationInstructions: "VERHANDLUNGSANWEISUNGEN",
      instructionPlaceholder: "Verhandlungspunkt oder Anweisung hinzufügen...",
      textScope: "TEXTBEREICH",
      selectedText: "Ausgewählter Text",
      wholeDocument: "Gesamtes Dokument",
      loadingText: "Ausgewählten Text laden...",
      refreshSelection: "Aktualisieren",
      noTextSelected: "Kein Text ausgewählt. Bitte wählen Sie Text im Dokument aus.",
      referenceLibrary: "REFERENZBIBLIOTHEK (OPTIONAL)",
      noReference: "Keine Referenz",
      clauseLibrary: "Klauselbibliothek",
      playbookLibrary: "Playbook-Bibliothek",
      vaultProject: "Tresor-Projekt",
      selectReference: "Referenz Auswählen",
      noClauses: "Keine Klauseln verfügbar",
      noPlaybooks: "Keine Playbooks verfügbar",
      noProjects: "Keine Projekte verfügbar",
      parsingDocument: "Dokument analysieren...",
      loadingReferences: "Referenzen laden...",
      analyzing: "Verhandlungspunkte analysieren...",
      completing: "Abschließen...",
      success: "Verhandlungsanalyse Abgeschlossen",
      successDescription: "Vorgeschlagene Änderungen wurden generiert",
      error: "Fehler",
      runAnalysis: "Verhandlungsanalyse Ausführen",
      suggestedAmendments: "Vorgeschlagene Änderungen",
      noInstructions: "Bitte fügen Sie mindestens eine Verhandlungsanweisung hinzu",
      addInstruction: "Hinzufügen",
    },
    clauseLibrary: {
      title: "Klauselbibliothek",
      loading: "Klauseln werden geladen...",
      noClauses: "Keine Klauseln gefunden. Erstellen Sie Ihre erste Klausel, um zu beginnen!",
      createClause: "Klausel Erstellen",
      editClause: "Klausel Bearbeiten",
      deleteClause: "Klausel Löschen",
      deleteClauseConfirm: "Möchten Sie wirklich löschen",
      deleteClauseWarning: " Diese Aktion kann nicht rückgängig gemacht werden.",
      clauseDeleted: "Klausel Gelöscht",
      clauseDeletedDescription: "Klausel wurde erfolgreich gelöscht",
      clauseDuplicated: "Klausel Dupliziert",
      clauseDuplicatedDescription: "Klausel wurde erfolgreich dupliziert",
      viewClause: "Klausel Anzeigen",
      clauseName: "Klauselname",
      clauseNamePlaceholder: "Klauselname eingeben",
      clauseText: "Klauseltext",
      clauseTextPlaceholder: "Klauseltext eingeben oder aus Auswahl laden",
      category: "Kategorie",
      categoryPlaceholder: "z.B. Vertraulichkeit, Kündigung",
      tags: "Tags",
      tagsPlaceholder: "Kommagetrennte Tags",
      description: "Beschreibung",
      descriptionPlaceholder: "Optionale Beschreibung",
      validationError: "Name und Text sind erforderlich",
      loadSelection: "Auswahl Laden",
      loadSelectionHint: "Wählen Sie Text im Dokument aus und klicken Sie auf 'Auswahl Laden'",
      loadingSelection: "Laden...",
      error: "Fehler",
    },
  },
};

const STORAGE_KEY = "selectedLanguage";

export const getStoredLanguage = (): LanguageCode => {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "en" || stored === "zh" || stored === "es" || stored === "fr" || stored === "ja" || stored === "de")) {
      return stored as LanguageCode;
    }
  } catch {
    // Ignore errors
  }
  return "en";
};

export const setStoredLanguage = (lang: LanguageCode): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore errors
  }
};

export const getTranslations = (lang: LanguageCode = getStoredLanguage()): Translations => {
  return translations[lang] || translations.en;
};

