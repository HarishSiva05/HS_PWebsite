// Real results from github.com/HarishSiva05/APT-Malware-Classification (Classifiers_Performance.ipynb).
// The confusion matrix is the Random Forest's, transcribed from the notebook's plot; it sums to
// 293/308 correct = 95.13%, matching the notebook's reported accuracy of 0.9513.

export const APT_DATASET = {
  /** APT groups the malware samples came from */
  groups: 43,
  /** groups with enough samples to appear in the held-out test set */
  evaluatedGroups: 35,
  /** held-out test samples behind the confusion matrix */
  testSamples: 308,
  correct: 293,
  /** distinct opcode pairs (2-grams) found across the samples */
  opcodePairs: 6326,
  source: "Classifiers_Performance.ipynb",
  repo: "https://github.com/HarishSiva05/APT-Malware-Classification",
}

/** Four classifiers, tuned with grid search; best first. */
export const APT_MODELS = [
  { name: "Random Forest", accuracy: 0.9513, precision: 0.9634, recall: 0.9513, f1: 0.9525 },
  { name: "SVM", accuracy: 0.9448, precision: 0.9609, recall: 0.9448, f1: 0.9472 },
  { name: "KNN", accuracy: 0.9416, precision: 0.9537, recall: 0.9416, f1: 0.9413 },
  { name: "Decision Tree", accuracy: 0.9318, precision: 0.9461, recall: 0.9318, f1: 0.9294 },
] as const

/** Random Forest confusion matrix, 35 x 35. Correct predictions per group (the diagonal)... */
export const CONFUSION_DIAGONAL: readonly number[] = [8, 9, 8, 9, 7, 13, 4, 6, 12, 7, 9, 9, 6, 8, 11, 5, 6, 9, 11, 10, 9, 13, 6, 11, 10, 10, 10, 7, 6, 7, 8, 4, 6, 10, 9]
/** ...and every misattribution as [actual group, predicted group, count]. All other cells are 0. */
export const CONFUSION_MISSES: readonly (readonly [number, number, number])[] = [[1, 27, 2], [3, 9, 1], [3, 27, 3], [4, 3, 1], [4, 5, 1], [4, 12, 1], [28, 29, 1], [28, 31, 1], [30, 27, 1], [32, 4, 1], [32, 27, 1], [33, 20, 1]]

/** Real opcode pairs from the extracted sequences, for texture. */
export const OPCODE_PAIRS: readonly string[] = ["LAHF NOP", "CALL JNP", "MOVZX LAHF", "INSW AND", "MOV FCOMI", "STC BT", "VPMOVMSKB ADD", "CDQ SUB", "IN POP", "JC MOVDQU", "TEST JA", "SHRD BSWAP", "FDIV ADD", "LAHF ADC", "XLAT PUSH", "MUL DEC", "SBB AND", "JG FLDZ", "JNZ JL", "JL SHL", "RCL SHR", "PMOVMSKB ADD", "MOVAPS SUB", "SHL OR", "MOV SHL", "SETBE JMP", "STOSD.REP ADD", "DEC CMC", "POP SUB", "SETL LEA", "POPAD INC", "SHLD ROR", "JBE ADC", "JNS RET", "LEA SETL", "FSTSW TEST", "BTC MOVZX", "JL JG", "TEST JNC", "PUSH FSTSW", "DAS INC", "MOVZX ROL", "JNZ BSWAP", "STOSW.REP MOV", "OR BOUND", "CALL STC", "JL LEA", "CMP RET", "NOT MOV", "PUSH MOVDQU", "SUB JLE", "PUSH BTC", "MOVSB.REP CALL", "JBE MOVZX", "FDIV JMP", "PSHUFD PSHUFD", "JGE FCOM", "CMPSD SAHF", "INT XOR", "JCXZ CMP", "INC BTC", "AND LAHF", "CMOVNZ PUSH", "JMP STOSB", "CWDE AAA", "PSRLDQ DEC", "POP JS", "STOSB.REP CALL", "SETA CMP", "NEG RCL", "LDMXCSR CALL", "JNZ VZEROUPPER", "MOVD PADDD", "JC POPAD", "JNO PUSH", "JNP TEST", "STC XADD", "MULSS DIVSS", "CMPSB MOV", "BTR AAD", "JLE POP", "MOVZX OR", "MUL PUSH", "PUSH INSB", "XORPS POP", "MOVSB OUT", "PUNPCKLDQ MOV", "IDIV SHR", "INC LEAVE", "MOVD TEST", "DEC CWDE", "COMISD JBE", "CWDE SETNO", "CLC SCASB.REPNE", "JNS SALC", "JMP INC.LOCK", "JZ MOVZX", "FNSTSW SAHF", "CALL MOVSD", "SHL PUSH", "JC XOR", "POPAD PUSH", "JZ MOV", "TEST SETA", "SHR CMC", "FNCLEX CMP", "FSTP PUSH", "DAS SAR", "SETC ADD", "JO MOV", "MOVZX XOR", "CMC PUSH", "LODSW IN", "LEA SHR", "XCHG ADC", "CMOVZ SHL", "ADD INT", "CMOVL MOV", "PUSH AND", "CALL IRETD"]

/** The first opcodes of real samples, as printed by the notebook. */
export const OPCODE_SAMPLES: readonly string[] = [
  "RET NOP NOP SUB MOV XOR MOV MOV MOV",
  "PUSH POP MOV MOV INT MOV INT PUSH PUSH",
]
