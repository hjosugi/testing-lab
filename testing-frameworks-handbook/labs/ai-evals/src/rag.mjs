// Retrieval (BM25) plus an extractive fake generator and a groundedness check,
// so retrieval recall and answer groundedness are measured separately.
const tokenize = text => text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];

export function buildIndex(documents, { k1 = 1.2, b = 0.75 } = {}) {
  const docs = documents.map(doc => ({ ...doc, tokens: tokenize(`${doc.title} ${doc.text}`) }));
  const avgLength = docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / docs.length;
  const df = new Map();
  for (const doc of docs) for (const term of new Set(doc.tokens)) df.set(term, (df.get(term) ?? 0) + 1);
  return {
    search(query, k = 3) {
      const terms = tokenize(query);
      return docs.map(doc => {
        let score = 0;
        for (const term of terms) {
          const tf = doc.tokens.filter(token => token === term).length;
          if (tf === 0) continue;
          const idf = Math.log(1 + (docs.length - df.get(term) + 0.5) / (df.get(term) + 0.5));
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.tokens.length) / avgLength)));
        }
        return { id: doc.id, score, text: doc.text };
      }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, k);
    },
  };
}

export function recallAtK(index, dataset, k) {
  const perQuestion = dataset.map(item => {
    const hits = index.search(item.question, k).map(hit => hit.id);
    const found = item.relevant.filter(id => hits.includes(id)).length;
    return { id: item.id, slice: item.slice, recall: found / item.relevant.length };
  });
  return { mean: perQuestion.reduce((sum, row) => sum + row.recall, 0) / perQuestion.length, perQuestion };
}

// Extractive fake generator: answers with the context sentence that shares
// the most tokens with the question. A deterministic stand-in for an LLM.
export function extractiveAnswer(question, contexts) {
  const q = new Set(tokenize(question));
  const sentences = contexts.flatMap(context => context.text.split(/(?<=[.。])\s*/).filter(Boolean));
  return sentences.map(sentence => ({ sentence, overlap: tokenize(sentence).filter(token => q.has(token)).length }))
    .sort((a, b) => b.overlap - a.overlap)[0]?.sentence ?? '';
}

// Groundedness: every answer sentence must have >= `minSupport` of its content
// tokens present in the retrieved context.
export function groundedness(answer, contexts, { minSupport = 0.8 } = {}) {
  const contextTokens = new Set(contexts.flatMap(context => tokenize(context.text)));
  const sentences = answer.split(/(?<=[.。])\s*/).filter(Boolean);
  const unsupported = sentences.filter(sentence => {
    const tokens = tokenize(sentence);
    return tokens.length > 0 && tokens.filter(token => contextTokens.has(token)).length / tokens.length < minSupport;
  });
  return { grounded: unsupported.length === 0, unsupported };
}
