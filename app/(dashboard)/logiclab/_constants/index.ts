import { Language, IdeSettings } from "../_types";

export const LANGUAGES: Language[] = [
  { id: 62, name: "Java (OpenJDK 13)", value: "java", extension: "java" },
  { id: 71, name: "Python 3", value: "python", extension: "py" },
  {
    id: 63,
    name: "JavaScript (Node.js)",
    value: "javascript",
    extension: "js",
  },
  { id: 54, name: "C++ (GCC 9.2)", value: "cpp", extension: "cpp" },
];

export const DEFAULT_IDE_SETTINGS: IdeSettings = {
  fontSize: 13,
  wordWrap: "on",
  buttonPosition: "toolbar",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15 dark:border-emerald-500/20",
  Medium:
    "text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15 dark:border-amber-500/20",
  Hard: "text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/15 dark:border-rose-500/20",
};

export const CODE_TEMPLATES: Record<string, string> = {
  python: `# Write Python 3 code here
print("Think deeply. Code simply.")
`,
  javascript: `// Write JavaScript code here
console.log("Think deeply. Code simply.");
`,
  cpp: `#include <iostream>

int main() {
    // Write C++ code here
    std::cout << "Think deeply. Code simply.";

    return 0;
}
`,
  java: `class Main {
    public static void main(String[] args) {
        // Write Java code here
        System.out.println("Think deeply. Code simply.");
    }
}
`,
};
