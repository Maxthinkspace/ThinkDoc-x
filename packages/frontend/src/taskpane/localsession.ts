const clauses = [
  {
    clause: "xxx",
    changes: [
      {
        type: "comment",
        input: {
          clause: "", // The extracted paragraph
          range: "", // The highlighted range of the comment. If the text contains track changes, use the amended text
          comment: "", // The comment text
        },
      },
      {
        type: "trackedchange",
        input: {
          originalText: "",
          amendedText: "",
          deleted: "",
          added: "",
        },
      },
      {
        type: "highlight",
        input: {
          clause: "",
          text: "", // The highlighted text. If the text contains track changes, use the amended text.
        },
      },
    ],
    rules: [
      {
        index: 1,
        annotationType: "instruction",
        instruction: "",
        example: "",
      },
      {
        index: 2,
        annotationType: "amendment",
        instruction: "",
        example: "",
      },
    ],
  },
];

const instructions = clauses.flatMap((c) =>
  c.rules.filter((r) => r.annotationType === "instruction")
);
const amendments = clauses.flatMap((c) => c.rules.filter((r) => r.annotationType === "amendment"));
const conditionals = clauses.flatMap((c) =>
  c.rules.filter((r) => r.annotationType === "conditional")
);

const total = instructions.length + amendments.length + conditionals.length;
