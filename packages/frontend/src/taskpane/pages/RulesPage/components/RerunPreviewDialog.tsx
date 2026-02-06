// import * as React from "react";
// import {
//   Dialog,
//   DialogSurface,
//   DialogBody,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   makeStyles,
//   Spinner,
//   Input,
//   Textarea,
//   Field,
// } from "@fluentui/react-components";
// import type { Rule } from "../index";
// import type { LinkedRuleWithDisplay } from "./RerunConfirmDialog";

// const useStyles = makeStyles({
//   section: {
//     marginBottom: "24px",
//   },
//   sectionLabel: {
//     fontSize: "15px",
//     fontWeight: 600,
//     color: "#333",
//     marginBottom: "12px",
//     marginTop: "16px",
//   },
//   ruleBox: {
//     backgroundColor: "#F6F6F6",
//     borderRadius: "8px",
//     padding: "16px",
//   },
//   ruleItem: {
//     marginBottom: "16px",
//     "&:last-child": {
//       marginBottom: "0",
//     },
//   },
//   ruleName: {
//     fontSize: "15px",
//     fontWeight: 600,
//     fontStyle: "italic",
//     color: "#333",
//     marginBottom: "8px",
//   },
//   fieldLabel: {
//     paddingBottom: "6px",
//     paddingTop: "16px",
//     display: "block",
//     fontSize: "14px",
//     fontWeight: 600,
//     color: "#333",
//   },
//   fieldLabelFirst: {
//     paddingBottom: "6px",
//     display: "block",
//     fontSize: "14px",
//     fontWeight: 600,
//     color: "#333",
//   },
//   ruleInstruction: {
//     fontSize: "14px",
//     color: "#5E687A",
//     marginBottom: "8px",
//   },
//   exampleBox: {
//     backgroundColor: "#E6E6E6",
//     borderRadius: "8px",
//     padding: "16px",
//     marginTop: "12px",
//   },
//   exampleLabel: {
//     fontSize: "14px",
//     fontWeight: 500,
//     color: "#333",
//     marginBottom: "8px",
//   },
//   exampleText: {
//     fontSize: "14px",
//     color: "#333",
//   },
//   buttonGroup: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "8px",
//     width: "100%",
//   },
//   spinnerContainer: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//   },
//   andSeparator: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: "16px 0",
//   },
//   andText: {
//     fontSize: "14px",
//     fontWeight: 600,
//     color: "#666",
//     backgroundColor: "#E6E6E6",
//     padding: "4px 16px",
//     borderRadius: "16px",
//   },
// });

// type RerunPreviewDialogProps = {
//   open: boolean;
//   previousRules: LinkedRuleWithDisplay[];
//   newRules: Rule[];
//   ruleDisplayIndex: number;
//   onApply: (editedRules: Rule[]) => void;
//   onCancel: () => void;
//   onTryAgain: () => void;
//   isTryingAgain?: boolean;
// };

// export const RerunPreviewDialog: React.FC<RerunPreviewDialogProps> = ({
//   open,
//   previousRules,
//   newRules,
//   ruleDisplayIndex,
//   onApply,
//   onCancel,
//   onTryAgain,
//   isTryingAgain = false,
// }) => {
//   const styles = useStyles();

//   // Editable state for new rules
//   const [editedRules, setEditedRules] = React.useState<Rule[]>(newRules);

//   // Update edited rules when newRules changes (e.g., after retry)
//   React.useEffect(() => {
//     setEditedRules(newRules);
//   }, [newRules]);

//   // Generate title text based on number of previous rules
//   const getTitleText = () => {
//     if (previousRules.length === 0) {
//       return `Do you want to make the following changes to Rule ${ruleDisplayIndex}?`;
//     }
    
//     if (previousRules.length === 1) {
//       const displayIdx = previousRules[0].displayIndex || ruleDisplayIndex;
//       return `Do you want to make the following changes to Rule ${displayIdx}?`;
//     }
    
//     // Multiple rules - format as "Rule X and Rule Y" or "Rule X, Rule Y, and Rule Z"
//     const ruleNumbers = previousRules.map(r => r.displayIndex || 0);
//     if (ruleNumbers.length === 2) {
//       return `Do you want to make the following changes to Rule ${ruleNumbers[0]} and Rule ${ruleNumbers[1]}?`;
//     }
    
//     // 3 or more rules
//     const lastRule = ruleNumbers.pop();
//     return `Do you want to make the following changes to Rule ${ruleNumbers.join(', Rule ')} and Rule ${lastRule}?`;
//   };

//   const handleBriefNameChange = (index: number, value: string) => {
//     setEditedRules((prev) =>
//       prev.map((rule, i) => (i === index ? { ...rule, brief_name: value } : rule))
//     );
//   };

//   const handleInstructionChange = (index: number, value: string) => {
//     setEditedRules((prev) =>
//       prev.map((rule, i) => (i === index ? { ...rule, instruction: value } : rule))
//     );
//   };

//   const handleExampleLanguageChange = (index: number, value: string) => {
//     setEditedRules((prev) =>
//       prev.map((rule, i) => (i === index ? { ...rule, example_language: value } : rule))
//     );
//   };

//   const handleApply = () => {
//     onApply(editedRules);
//   };

//   return (
//     <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
//       <DialogSurface style={{ maxWidth: "600px" }}>
//         <DialogBody>
//           <DialogTitle>
//             {getTitleText()}
//           </DialogTitle>
//           <DialogContent>
//             {/* Previous Rules (Read-only) */}
//             <div className={styles.section}>
//               <div className={styles.sectionLabel}>From –</div>
//               {previousRules.map((rule, index) => (
//                 <React.Fragment key={rule.id}>
//                   <div className={styles.ruleBox}>
//                     <div className={styles.ruleItem}>
//                       <div className={styles.ruleName}>
//                         Rule {rule.displayIndex}: {rule.brief_name}
//                       </div>
//                       <div className={styles.fieldLabelFirst}>Instruction:</div>
//                       <div className={styles.ruleInstruction}>{rule.instruction}</div>
//                       {rule.example_language && (
//                         <div className={styles.exampleBox}>
//                           <div className={styles.exampleLabel}>Example Language:</div>
//                           <div className={styles.exampleText}>{rule.example_language}</div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                   {/* AND separator between rules (not after the last one) */}
//                   {index < previousRules.length - 1 && (
//                     <div className={styles.andSeparator}>
//                       <span className={styles.andText}>AND</span>
//                     </div>
//                   )}
//                 </React.Fragment>
//               ))}
//             </div>

//             {/* New Rules (Editable) */}
//             <div className={styles.section}>
//               <div className={styles.sectionLabel}>To –</div>
//               {editedRules.map((rule, index) => (
//                 <React.Fragment key={rule.id || index}>
//                   <div className={styles.ruleBox}>
//                     <div className={styles.ruleItem}>
//                       <label className={styles.fieldLabelFirst}>
//                         Brief Name
//                       </label>
//                       <Field>
//                         <Input
//                           value={rule.brief_name}
//                           onChange={(_, data) => handleBriefNameChange(index, data.value)}
//                           placeholder="3-8 word summary"
//                         />
//                       </Field>

//                       <label className={styles.fieldLabel}>
//                         Instruction <span style={{ color: "red" }}>*</span>
//                       </label>
//                       <Field>
//                         <Textarea
//                           rows={4}
//                           value={rule.instruction}
//                           onChange={(_, data) => handleInstructionChange(index, data.value)}
//                           resize="vertical"
//                         />
//                       </Field>

//                       {(rule.example_language !== undefined) && (
//                         <div className={styles.exampleBox}>
//                           <label className={styles.exampleLabel}>
//                             Example Language
//                           </label>
//                           <Field>
//                             <Textarea
//                               rows={4}
//                               value={rule.example_language || ""}
//                               onChange={(_, data) => handleExampleLanguageChange(index, data.value)}
//                               resize="vertical"
//                             />
//                           </Field>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                   {/* AND separator between new rules if there are multiple */}
//                   {index < editedRules.length - 1 && (
//                     <div className={styles.andSeparator}>
//                       <span className={styles.andText}>AND</span>
//                     </div>
//                   )}
//                 </React.Fragment>
//               ))}
//             </div>
//           </DialogContent>
//           <DialogActions>
//             <div className={styles.buttonGroup}>
//               <Button
//                 appearance="primary"
//                 onClick={handleApply}
//                 style={{ backgroundColor: "#0F62FE" }}
//               >
//                 Change
//               </Button>
//               <Button
//                 appearance="outline"
//                 onClick={onTryAgain}
//                 disabled={isTryingAgain}
//                 style={{ borderColor: "#0F62FE", color: "#0F62FE" }}
//               >
//                 {isTryingAgain ? (
//                   <span className={styles.spinnerContainer}>
//                     <Spinner size="tiny" style={{ color: "#0F62FE" }} />
//                     Trying...
//                   </span>
//                 ) : (
//                   "Try Again"
//                 )}
//               </Button>
//               <Button
//                 appearance="outline"
//                 onClick={onCancel}
//                 style={{ borderColor: "#0F62FE", color: "#0F62FE" }}
//               >
//                 Do Not Change
//               </Button>
//             </div>
//           </DialogActions>
//         </DialogBody>
//       </DialogSurface>
//     </Dialog>
//   );
// };