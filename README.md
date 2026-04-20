# RE-to-DFA-Automata-Simulator

A web-based interactive tool that converts regular expressions into visual NFA, DFA, and minimized DFA diagrams using Mermaid.js. 
It also features a built-in string testing simulator to verify matches directly against your automata state machines.

## Features

- **Regular Expression Parser:** Supports standard operators like `*` (Kleene star), `|` (union), `.` (concatenation - implicit and explicit), and `()` (grouping).
- **Automata Visualizations:** Automatically generates structural flowcharts for:
  - Nondeterministic Finite Automata (NFA)
  - Deterministic Finite Automata (DFA)
  - Minimized DFA
- **String Testing:** A built-in simulator to test if an input string matches your parsed regular expression and automaton.
- **Modern UI:** A clean, glassmorphic design featuring responsive graphs and interactive tabs for seamlessly switching between different automata stages.

## Technologies Used

- **HTML5 & CSS3** for a responsive, clean, and modern interface.
- **Vanilla JavaScript** to handle all parsing, automata node generation (Thompson's construction), subset construction, and DFA minimization algorithms.
- **Mermaid.js** to dynamically render the generated automata nodes and transitions into interactive visual diagrams.

## How to Use

1. Clone or download this repository to your local machine.
2. Open `index.html` in any modern web browser.
3. Enter a regular expression in the top input field (e.g., `(a|b)*abb`) and click **Simulate**.
4. Use the bottom tabs to toggle between viewing the **NFA Diagram**, **DFA Diagram**, and **Minimized DFA**.
5. Use the **Test a String** section to enter a custom string and verify whether the automata (and expression) accepts or rejects it.

## Local Setup

This project uses entirely client-side technologies. No complex server environments, installations, or build steps like Webpack/Vite are required. Simply open `index.html` directly in your browser to begin perfectly simulating finite state machines.
