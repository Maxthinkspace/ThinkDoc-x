// import { getComments, getHighlights, getTrackChanges, getContent } from "../taskpane/taskpane";

// export const structureClauses = async () => {
//   const comments = await getComments();
//   console.log(`got comments: ${comments.length}`);
//   console.log(comments);
//   const highlights = await getHighlights();
//   console.log(`got highlights: ${highlights.length}`);
//   console.log(highlights);
//   const trackedChanges = await getTrackChanges();
//   console.log(`got tracked changes: ${trackedChanges.length}`);
//   console.log(trackedChanges);

//   // maintain a global data structure to store all annotations
//   const clauses = [];
//   comments.forEach((comment) => {
//     const existingClause = clauses.find((c) => c.clause === comment.paragraph);
//     const change = {
//       type: "comment",
//       input: {
//         clause: comment.paragraph,
//         range: comment.range,
//         comment: comment.comments[0],
//       },
//     };
//     if (existingClause) {
//       existingClause.changes.push(change);
//     } else {
//       clauses.push({
//         clause: comment.paragraph,
//         changes: [change],
//         rules: [],
//       });
//     }
//   });

//   highlights.forEach((highlight) => {
//     const existingClause = clauses.find((c) => c.clause === highlight.paragraph);
//     const change = {
//       type: "highlight",
//       input: {
//         clause: highlight.paragraph,
//         text: highlight.text,
//       },
//     };
//     if (existingClause) {
//       existingClause.changes.push(change);
//     } else {
//       clauses.push({
//         clause: highlight.paragraph,
//         changes: [change],
//         rules: [],
//       });
//     }
//   });

//   trackedChanges.forEach((trackedChange) => {
//     const existingClause = clauses.find((c) => c.clause === trackedChange.paragraph);
//     const change = {
//       type: "trackedchange",
//       input: {
//         // originalText: trackedChange.originalText,
//         amendedText: trackedChange.paragraph,
//         deleted: trackedChange.kind === "delete" ? trackedChange.originalText : "",
//         added: trackedChange.kind === "insert" ? trackedChange.text : "",
//         positionInParagraph: trackedChange.positionInParagraph,
//       },
//     };
//     if (existingClause) {
//       existingClause.changes.push(change);
//     } else {
//       clauses.push({
//         clause: trackedChange.paragraph,
//         changes: [change],
//         rules: [],
//       });
//     }
//   });
//   console.log(clauses);
//   sessionStorage.setItem("clauses", JSON.stringify(clauses));
//   return clauses;
// };

// // export const formatGenerateInput = async (comments, highlights, trackedChanges) => {
// //   let annotation = "";
// //   for (const comment of comments) {
// //     annotation += `
// //     Clause language: ${comment.clause}
// //     Annotation Type: Comments
// //     Range: ${comment.range}
// //     Instruction: ${comment.comment}
// //     `;
// //   }
// //
// //   for (const highlight of highlights) {
// //     annotation += `
// //     Clause language: ${highlight.clause}
// //     Annotation Type: Highlights
// //     Highlight: ${highlight.text}
// //     `;
// //   }
// //
// //   for (const trackedChange of trackedChanges) {
// //     annotation += `
// //     Annotation Type: Tracked Changes
// //     AmendedText: ${trackedChange.amendedText}
// //     Deleted: ${trackedChange.deleted}
// //     Added: ${trackedChange.added}
// //     Position of Change in Paragraph: ${trackedChange.positionInParagraph}
// //     `;
// //   }
// //   console.log(annotation);
// //   return annotation;
// // };

// export const formatExpandInput = async (rules: string) => {
//   const content = await getContent();

//   return `${rules}
  
//   Agreement:

//   ${content}
//   `;
// };
