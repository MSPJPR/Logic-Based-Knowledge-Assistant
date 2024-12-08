// Initialize the knowledge base
let knowledgeBase = [];

/**
 * Function to add facts and rules to the knowledge base.
 * @param {string} input - Facts and rules as a string.
 */
function addKnowledge(input) {
    const lines = input.split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            knowledgeBase.push(parseRule(line.trim()));
        }
    });
    displayMessage("Knowledge added successfully!");
}

/**
 * Function to parse a rule or fact.
 * @param {string} statement - A single fact or rule string.
 * @returns {object} - Parsed rule object.
 */
function parseRule(statement) {
    if (statement.includes(":-")) {
        const [head, body] = statement.split(":-").map(s => s.trim());
        const bodyParts = body.split(",").map(s => s.trim());
        return { type: "rule", head: parsePredicate(head), body: bodyParts.map(parsePredicate) };
    } else {
        return { type: "fact", predicate: parsePredicate(statement) };
    }
}

/**
 * Function to parse a predicate string.
 * @param {string} predStr - Predicate string like "parent(john, mary)".
 * @returns {object} - Parsed predicate with name and arguments.
 */
function parsePredicate(predStr) {
    const match = predStr.match(/(\w+)([^)]+)/);
    if (match) {
        const name = match[1];
        const args = match[2].split(',').map(arg => arg.trim());
        return { name, args };
    } else {
        throw new Error(`Invalid predicate format: ${predStr}`);
    }
}

/**
 * Function to resolve a query with unification and resolution.
 * @param {string} queryStr - Query string like "parent(john, X)".
 */
function resolveQuery(queryStr) {
    try {
        const query = parsePredicate(queryStr);
        const results = resolve(query, knowledgeBase, []);
        if (results.length > 0) {
            displayResults(results);
        } else {
            displayMessage("No solution found.");
        }
    } catch (error) {
        displayMessage(`Error: ${error.message}`);
    }
}

/**
 * Recursive function to resolve a query.
 * @param {object} query - Parsed query object.
 * @param {array} kb - Knowledge base.
 * @param {array} derivationPath - Current derivation path for visualization.
 * @returns {array} - List of successful resolutions.
 */
function resolve(query, kb, derivationPath) {
    let results = [];
    for (let entry of kb) {
        if (entry.type === "fact") {
            const substitution = unify(query, entry.predicate);
            if (substitution) {
                results.push(applySubstitution(query, substitution));
                visualizeDerivation(derivationPath.concat([entry.predicate]));
            }
        } else if (entry.type === "rule" && entry.head.name === query.name) {
            const substitution = unify(query, entry.head);
            if (substitution) {
                let resolved = true;
                let newPath = derivationPath.concat([entry.head]);
                for (let bodyPredicate of entry.body) {
                    const newQuery = applySubstitution(bodyPredicate, substitution);
                    const subResults = resolve(newQuery, kb, newPath);
                    if (subResults.length === 0) {
                        resolved = false;
                        break;
                    }
                }
                if (resolved) {
                    results.push(applySubstitution(query, substitution));
                    visualizeDerivation(newPath);
                }
            }
        }
    }
    return results;
}

/**
 * Function to unify two predicates.
 * @param {object} q1 - First predicate.
 * @param {object} q2 - Second predicate.
 * @returns {object|null} - Substitution map or null if unification fails.
 */
function unify(q1, q2) {
    if (q1.name !== q2.name || q1.args.length !== q2.args.length) {
        return null;
    }
    let substitution = {};
    for (let i = 0; i < q1.args.length; i++) {
        const arg1 = q1.args[i];
        const arg2 = q2.args[i];
        if (isVariable(arg1)) {
            substitution[arg1] = arg2;
        } else if (isVariable(arg2)) {
            substitution[arg2] = arg1;
        } else if (arg1 !== arg2) {
            return null;
        }
    }
    return substitution;
}

/**
 * Function to check if a string is a variable.
 * @param {string} arg - Argument string.
 * @returns {boolean} - True if the argument is a variable.
 */
function isVariable(arg) {
    return /^[A-Z]/.test(arg);
}

/**
 * Function to apply substitution to a predicate.
 * @param {object} predicate - Predicate object.
 * @param {object} substitution - Substitution map.
 * @returns {object} - Predicate with substitutions applied.
 */
function applySubstitution(predicate, substitution) {
    return {
        name: predicate.name,
        args: predicate.args.map(arg => substitution[arg] || arg),
    };
}

/**
 * Function to visualize the derivation tree using D3.js.
 * @param {array} path - Derivation path.
 */
function visualizeDerivation(path) {
    const treeContainer = document.getElementById("derivation-tree");
    treeContainer.innerHTML = "";

    const data = {
        name: "Query",
        children: path.map(p => ({ name: `${p.name}(${p.args.join(", ")})` })),
    };

    const width = 600, height = 300;

    const svg = d3.select(treeContainer)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(40,0)");

    const root = d3.hierarchy(data);

    const treeLayout = d3.tree().size([width - 80, height - 20]);
    treeLayout(root);

    svg.selectAll(".link")
        .data(root.links())
        .enter().append("line")
        .attr("class", "link")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("stroke", "#555");

    svg.selectAll(".node")
        .data(root.descendants())
        .enter().append("circle")
        .attr("class", "node")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 5)
        .attr("fill", "#999");

    svg.selectAll(".label")
        .data(root.descendants())
        .enter().append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 10)
        .attr("text-anchor", "middle")
        .text(d => d.data.name);
}

/**
 * Function to display messages.
 * @param {string} message - Message to display.
 */
function displayMessage(message) {
    document.getElementById("output").innerText = message;
}

/**
 * Function to display results.
 * @param {array} results - Resolved results.
 */
function displayResults(results) {
    document.getElementById("output").innerText = "Results:\n" + results.map(res => `${res.name}(${res.args.join(", ")})`).join("\n");
}
