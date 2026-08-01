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
  python: `import sys

# Read from Standard Input
input_data = sys.stdin.read().strip()

print("Hello from LogicLab!")
if input_data:
    print("Input:", input_data)
`,
  javascript: `const fs = require('fs');

// Read from Standard Input
const input_data = fs.readFileSync(0, 'utf-8').trim();

console.log("Hello from LogicLab!");
if (input_data) {
    console.log("Input:", input_data);
}
`,
  cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {
    cout << "Hello from LogicLab!\\n";
    
    // Read from Standard Input
    string input_data;
    if (getline(cin, input_data) && !input_data.empty()) {
        cout << "Input: " << input_data << "\\n";
    }
    
    return 0;
}
`,
  java: `import java.util.Scanner;

class Main {
    public static void main(String[] args) {
        System.out.println("Hello from LogicLab!");
        
        // Read from Standard Input
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            String input_data = scanner.nextLine();
            if (!input_data.isEmpty()) {
                System.out.println("Input: " + input_data);
            }
        }
        scanner.close();
    }
}
`,
};
