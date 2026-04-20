// ==========================================
// 1. Initial Setup and DOM Elements
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    const simulateBtn = document.getElementById('simulateBtn');
    const regexInput = document.getElementById('regexInput');
    const resultsSection = document.getElementById('resultsSection');
    const postfixResult = document.getElementById('postfixResult');
    
    let currentMinDFA = null;
    const testInput = document.getElementById('testInput');
    const testBtn = document.getElementById('testBtn');
    const testResult = document.getElementById('testResult');
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    simulateBtn.addEventListener('click', handleSimulation);
    regexInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSimulation();
    });

    testBtn.addEventListener('click', handleTestString);
    testInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleTestString();
    });

    function handleTestString() {
        if (!currentMinDFA || !currentMinDFA.start) return;
        const str = testInput.value.replace(/\s+/g, '');
        let currState = currentMinDFA.start;
        let isRejected = false;
        
        for(let char of str) {
            let nextName = currState.transitions[char];
            if(!nextName) {
                isRejected = true;
                break;
            }
            currState = currentMinDFA.states.find(s => s.name === nextName);
            if(!currState || currState.isDead) { // wait, we removed dead state visually, but conceptually we just check if state exists
                isRejected = true;
                break;
            }
        }
        
        testResult.className = 'test-result'; // reset classes
        if(!isRejected && currState.isAccept) {
            testResult.textContent = `String "${str}" is ACCEPTED`;
            testResult.classList.add('accepted');
        } else {
            testResult.textContent = `String "${str}" is REJECTED`;
            testResult.classList.add('rejected');
        }
    }

    function handleSimulation() {
        const regexStr = regexInput.value.replace(/\s+/g, '');
        if (!regexStr) {
            alert('Please enter a regular expression.');
            return;
        }

        try {
            // 1. Insert explicit concatenation characters
            const formattedRegex = formatRegex(regexStr);
            
            // 2. Convert to postfix
            const postfix = infixToPostfix(formattedRegex);
            postfixResult.textContent = postfix;

            // 3. Construct NFA (Thompson's)
            stateCounter = 0; // Reset state counter
            const nfa = thompson(postfix);

            // 4. Construct DFA (Subset)
            const dfa = constructDFA(nfa);

            const minDfa = minimizeDFA(dfa);
            
            // Save state globally so we can test strings
            currentMinDFA = minDfa;
            testResult.textContent = '';
            testResult.className = 'test-result';
            testInput.value = '';

            // 5. Render
            renderMermaid('nfaDiagram', generateMermaidNFA(nfa));
            renderMermaid('dfaDiagram', generateMermaidDFA(dfa));
            renderMermaid('minDfaDiagram', generateMermaidDFA(minDfa));

            resultsSection.classList.remove('hidden');
        } catch (error) {
            alert('Error parsing or simulating: ' + error.message);
            console.error(error);
        }
    }
});

// ==========================================
// 2. Regex Parsing & Formatting
// ==========================================

// Adds explicit '.' for concatenation
function formatRegex(regex) {
    let res = "";
    const allOperators = ['|', '?', '+', '*', '^'];
    const binaryOperators = ['|', '^'];
    
    for (let i = 0; i < regex.length; i++) {
        let c1 = regex[i];
        res += c1;
        
        if (i + 1 < regex.length) {
            let c2 = regex[i + 1];
            
            // If c1 isn't an open parens and isn't a binary operator
            let c1IsAValue = c1 !== '(' && !binaryOperators.includes(c1);
            // If c2 isn't a close parens and isn't any operator
            let c2IsAValue = c2 !== ')' && !allOperators.includes(c2);
            
            if (c1IsAValue && c2IsAValue) {
                res += '.'; // Explicit concat
            }
        }
    }
    return res;
}

function precedence(char) {
    switch (char) {
        case '|': return 1;
        case '.': return 2;
        case '*': return 3;
        default: return 0;
    }
}

// Shunting-Yard Algorithm
function infixToPostfix(infix) {
    let postfix = "";
    let stack = [];
    
    for (const char of infix) {
        if (/[a-zA-Z0-9]/.test(char) || char === 'ε') {
            postfix += char;
        } else if (char === '(') {
            stack.push(char);
        } else if (char === ')') {
            while (stack.length > 0 && stack[stack.length - 1] !== '(') {
                postfix += stack.pop();
            }
            stack.pop(); // Remove '('
        } else {
            // Operator
            while (stack.length > 0 && precedence(stack[stack.length - 1]) >= precedence(char)) {
                postfix += stack.pop();
            }
            stack.push(char);
        }
    }
    
    while (stack.length > 0) {
        postfix += stack.pop();
    }
    
    return postfix;
}

// ==========================================
// 3. Automata Structures & Thompson's Const.
// ==========================================

let stateCounter = 0;
function nextState() {
    return 'q' + (stateCounter++);
}

class State {
    constructor(id) {
        this.id = id;
        this.transitions = {}; // {symbol: [State1, State2]}
        this.isAccept = false;
    }
    
    addTransition(symbol, state) {
        if (!this.transitions[symbol]) {
            this.transitions[symbol] = [];
        }
        this.transitions[symbol].push(state);
    }
}

class NFA {
    constructor(start, accept) {
        this.start = start;
        this.accept = accept; // The single accept state for building
        this.accept.isAccept = true;
    }
}

function thompson(postfix) {
    let stack = [];
    
    for (const char of postfix) {
        if (/[a-zA-Z0-9]/.test(char) || char === 'ε') {
            // Literal
            let start = new State(nextState());
            let accept = new State(nextState());
            start.addTransition(char, accept);
            stack.push(new NFA(start, accept));
            
        } else if (char === '.') {
            // Concatenation
            let right = stack.pop();
            let left = stack.pop();
            
            left.accept.isAccept = false;
            left.accept.addTransition('ε', right.start);
            stack.push(new NFA(left.start, right.accept));
            
        } else if (char === '|') {
            // Union
            let right = stack.pop();
            let left = stack.pop();
            
            let start = new State(nextState());
            let accept = new State(nextState());
            
            start.addTransition('ε', left.start);
            start.addTransition('ε', right.start);
            
            left.accept.isAccept = false;
            right.accept.isAccept = false;
            left.accept.addTransition('ε', accept);
            right.accept.addTransition('ε', accept);
            
            stack.push(new NFA(start, accept));
            
        } else if (char === '*') {
            // Kleene Star
            let nfa = stack.pop();
            
            let start = new State(nextState());
            let accept = new State(nextState());
            
            start.addTransition('ε', nfa.start);
            start.addTransition('ε', accept);
            
            nfa.accept.isAccept = false;
            nfa.accept.addTransition('ε', nfa.start);
            nfa.accept.addTransition('ε', accept);
            
            stack.push(new NFA(start, accept));
        }
    }
    
    return stack.pop();
}

// ==========================================
// 4. Subset Construction (NFA to DFA)
// ==========================================

function getEpsilonClosure(states) {
    let closure = new Set(states);
    let stack = [...states];
    
    while (stack.length > 0) {
        let current = stack.pop();
        if (current.transitions['ε']) {
            for (let next of current.transitions['ε']) {
                if (!closure.has(next)) {
                    closure.add(next);
                    stack.push(next);
                }
            }
        }
    }
    return Array.from(closure);
}

function getMove(states, symbol) {
    let moves = new Set();
    for (let state of states) {
        if (state.transitions[symbol]) {
            for (let next of state.transitions[symbol]) {
                moves.add(next);
            }
        }
    }
    return Array.from(moves);
}

function constructDFA(nfa) {
    // Collect alphabet
    let alphabet = new Set();
    let allNfaStates = new Set();
    let q = [nfa.start];
    while(q.length > 0) {
        let curr = q.pop();
        if(!allNfaStates.has(curr)) {
            allNfaStates.add(curr);
            for (let symbol in curr.transitions) {
                if (symbol !== 'ε') alphabet.add(symbol);
                for(let next of curr.transitions[symbol]) {
                    q.push(next);
                }
            }
        }
    }
    alphabet = Array.from(alphabet);
    
    // Start subset construction
    let startClosure = getEpsilonClosure([nfa.start]);
    
    let dfaStates = []; // Array of { id, nfaStates: [], transitions: {}, isAccept: bool }
    
    function getId(nfaStateArray) {
        let sorted = nfaStateArray.map(s => s.id).sort().join(',');
        return sorted;
    }
    
    let startId = getId(startClosure);
    let dfaStart = {
        name: 'D0',
        signature: startId,
        nfaStates: startClosure,
        transitions: {},
        isAccept: startClosure.some(s => s.isAccept)
    };
    
    dfaStates.push(dfaStart);
    let unmarked = [dfaStart];
    let dfaCounter = 1;
    
    while (unmarked.length > 0) {
        let t = unmarked.shift();
        
        for (let symbol of alphabet) {
            let moveSet = getMove(t.nfaStates, symbol);
            if (moveSet.length === 0) continue;
            
            let uClosure = getEpsilonClosure(moveSet);
            let uId = getId(uClosure);
            
            let existing = dfaStates.find(s => s.signature === uId);
            if (!existing) {
                let newState = {
                    name: 'D' + (dfaCounter++),
                    signature: uId,
                    nfaStates: uClosure,
                    transitions: {},
                    isAccept: uClosure.some(s => s.isAccept)
                };
                dfaStates.push(newState);
                unmarked.push(newState);
                t.transitions[symbol] = newState.name;
            } else {
                t.transitions[symbol] = existing.name;
            }
        }
    }
    
    return { states: dfaStates, start: dfaStart };
}

// ==========================================
// 5. Mermaid Generators & Rendering
// ==========================================

async function renderMermaid(containerId, diagramString) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    try {
        const { svg } = await mermaid.render('mermaid-' + containerId, diagramString);
        container.innerHTML = svg;
    } catch (e) {
        console.error("Mermaid parsing error:", e);
        container.innerHTML = `<p style="color: red;">Error generating diagram.</p>`;
    }
}

function generateMermaidNFA(nfa) {
    let out = "stateDiagram-v2\n";
    out += "    direction LR\n";
    out += `    [*] --> ${nfa.start.id}\n`;
    
    let visited = new Set();
    let q = [nfa.start];
    
    while(q.length > 0) {
        let curr = q.pop();
        if(visited.has(curr.id)) continue;
        visited.add(curr.id);
        
        if (curr.isAccept) {
            out += `    ${curr.id} : ${curr.id} ((Accept))\n`;
        }
        
        let edgeMap = {};
        for (let sym in curr.transitions) {
            for (let next of curr.transitions[sym]) {
                if(!edgeMap[next.id]) edgeMap[next.id] = [];
                edgeMap[next.id].push(sym === 'ε' ? 'e' : sym);
                q.push(next);
            }
        }
        
        for (let target in edgeMap) {
            let symStr = Array.from(new Set(edgeMap[target])).join(', ');
            out += `    ${curr.id} --> ${target} : ${symStr}\n`;
        }
    }
    return out;
}


function minimizeDFA(dfa) {
    if (dfa.states.length === 0) return { states: [], start: null };

    let alphabet = new Set();
    for(let s of dfa.states) {
        for(let sym in s.transitions) {
            alphabet.add(sym);
        }
    }
    alphabet = Array.from(alphabet);

    let reachable = new Set();
    let q = [dfa.start.name];
    reachable.add(dfa.start.name);
    
    while(q.length > 0) {
        let curr = q.pop();
        let state = dfa.states.find(s => s.name === curr);
        if(!state) continue;
        for(let sym of alphabet) {
            let next = state.transitions[sym];
            if(next && !reachable.has(next)) {
                reachable.add(next);
                q.push(next);
            }
        }
    }
    
    let states = dfa.states.filter(s => reachable.has(s.name));

    let needsDead = false;
    for(let s of states) {
        for(let a of alphabet) {
            if(!s.transitions[a]) {
                needsDead = true;
                break;
            }
        }
    }
    
    let allStates = [...states];
    let deadStateName = 'Dead';
    if(needsDead) {
        let deadState = {
            name: deadStateName,
            transitions: {},
            isAccept: false
        };
        for(let a of alphabet) {
            deadState.transitions[a] = deadStateName;
        }
        allStates.push(deadState);
    }
    
    let n = allStates.length;
    let stateIdx = {};
    for(let i=0; i<n; i++) stateIdx[allStates[i].name] = i;
    
    let dist = Array.from({length: n}, () => Array(n).fill(false));
    
    for(let i=0; i<n; i++) {
        for(let j=0; j<n; j++) {
            if(allStates[i].isAccept !== allStates[j].isAccept) {
                dist[i][j] = true;
            }
        }
    }
    
    let changed = true;
    while(changed) {
        changed = false;
        for(let i=0; i<n; i++) {
            for(let j=i+1; j<n; j++) {
                if(!dist[i][j]) {
                    for(let a of alphabet) {
                        let next_i = allStates[i].transitions[a] || deadStateName;
                        let next_j = allStates[j].transitions[a] || deadStateName;
                        
                        let ni = stateIdx[next_i];
                        let nj = stateIdx[next_j];
                        
                        if(ni !== nj && dist[ni][nj]) {
                            dist[i][j] = true;
                            dist[j][i] = true;
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    let partitions = [];
    let visited = new Set();
    for(let i=0; i<n; i++) {
        if(!visited.has(i)) {
            let part = [i];
            visited.add(i);
            for(let j=i+1; j<n; j++) {
                if(!dist[i][j]) {
                    part.push(j);
                    visited.add(j);
                }
            }
            partitions.push(part);
        }
    }
    
    let minDfaStates = [];
    let minDfaStart = null;
    
    let minCounter = 0;
    let partToName = new Array(partitions.length);
    for(let p=0; p<partitions.length; p++) {
        partToName[p] = 'MD' + (minCounter++);
    }
    
    for(let p=0; p<partitions.length; p++) {
        let part = partitions[p];
        let repIdx = part[0];
        let repState = allStates[repIdx];
        
        let isDeadPart = needsDead && part.includes(stateIdx[deadStateName]);
        let isAccept = part.some(idx => allStates[idx].isAccept);
        let minState = {
            name: partToName[p],
            origNames: part.map(idx => allStates[idx].name).join(','),
            transitions: {},
            isAccept: isAccept,
            isDead: isDeadPart
        };
        
        for(let a of alphabet) {
            let targetOrig = repState.transitions[a] || deadStateName;
            let targetIdx = stateIdx[targetOrig];
            let targetPart = partitions.findIndex(pt => pt.includes(targetIdx));
            minState.transitions[a] = partToName[targetPart];
        }
        
        minDfaStates.push(minState);
        
        if(part.includes(stateIdx[dfa.start.name])) {
            minDfaStart = minState;
        }
    }
    
    minDfaStates = minDfaStates.filter(s => !s.isDead);
    for(let s of minDfaStates) {
        for(let a of alphabet) {
            let targetName = s.transitions[a];
            let targetState = minDfaStates.find(ts => ts.name === targetName);
            if(!targetState) {
                delete s.transitions[a];
            }
        }
    }
    
    return { states: minDfaStates, start: minDfaStart };
}

function generateMermaidDFA(dfa) {
    if (dfa.states.length === 0) return "stateDiagram-v2\n    [*] --> Empty\n";
    
    let out = "stateDiagram-v2\n";
    out += "    direction LR\n";
    out += `    [*] --> ${dfa.start.name}\n`;
    
    for (let state of dfa.states) {
        if (state.isAccept) {
            out += `    ${state.name} : ${state.name} ((Accept))\n`;
        }
        
        let edgeMap = {};
        for (let sym in state.transitions) {
            let nextName = state.transitions[sym];
            if(!edgeMap[nextName]) edgeMap[nextName] = [];
            edgeMap[nextName].push(sym);
        }
        
        for(let target in edgeMap) {
            let symStr = Array.from(new Set(edgeMap[target])).join(', ');
            out += `    ${state.name} --> ${target} : ${symStr}\n`;
        }
    }
    
    return out;
}
