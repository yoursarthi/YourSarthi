'use strict';

module.exports = {
  ollama:     require('./ollama.service'),
  embeddings: require('./embeddings.service'),
  chunking:   require('./chunking.service'),
  retrieval:  require('./retrieval.service'),
  prompt:     require('./prompt.service'),
  rag:        require('./rag.service'),
};
