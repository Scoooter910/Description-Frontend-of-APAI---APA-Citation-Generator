import React, { useState } from 'react';
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-csl';
import '@citation-js/plugin-bibjson';

function App() {
  const [query, setQuery] = useState('');
  const [doiInput, setDoiInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [results, setResults] = useState([]);
  const [citation, setCitation] = useState('');
  const [citations, setCitations] = useState([]);
  const [savedCitations, setSavedCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const fetchBooks = async () => {
    if (!query) return;
    setLoading(true);
    setCitation('');
    setSelectedBook(null);
    setResults([]);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.docs.length > 0) {
        setResults(data.docs.slice(0, 5));
      } else {
        setCitation('No results found.');
      }
    } catch (err) {
      console.error(err);
      setCitation('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  const fetchDOI = async () => {
    if (!doiInput) return;
    setLoading(true);
    setCitation('');
    setSelectedBook(null);

    let doi = doiInput;
    if (doi.includes('doi.org/')) {
      doi = doi.split('doi.org/')[1];
    }

    try {
      const response = await fetch(`https://api.crossref.org/works/${doi}`);
      const data = await response.json();

      const cite = new Cite(data.message);
      const apa = cite.format('citation', {
        template: 'apa',
        lang: 'en-US'
      });

      setCitation(apa);
    } catch (err) {
      console.error(err);
      setCitation('Failed to fetch citation from DOI. Please check the input.');
    }

    setLoading(false);
  };

  const fetchCitationByTopic = async () => {
    if (!topicInput) return;
    setLoading(true);
    setCitation('');
    setCitations([]);
    setSelectedBook(null);
    setResults([]);

    try {
      const response = await fetch('https://apai-backend-server.onrender.com/api/cite-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput })
      });

      const citationArray = await response.json();

      const citationsWithLinks = await Promise.all(
        citationArray.map(async (c) => {
          const formattedCitation = `${c.author} (${c.year}). ${c.title}. ${c.publisher}.`;

          try {
            const searchRes = await fetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(c.title)}&filter=type:journal-article`);
            const searchData = await searchRes.json();

            const doiItem = searchData.message.items[0];
            const doiURL = doiItem ? `https://doi.org/${doiItem.DOI}` : null;

            return {
              ...c,
              citationText: formattedCitation,
              doiLink: doiURL
            };
          } catch (error) {
            console.error('Error searching CrossRef:', error);
            return {
              ...c,
              citationText: formattedCitation,
              doiLink: null
            };
          }
        })
      );

      setCitations(citationsWithLinks);

    } catch (err) {
      console.error(err);
      setCitation('Failed to generate citations from AI.');
    }

    setLoading(false);
  };

  const generateCitation = (book) => {
    const citationData = {
      type: 'book',
      title: book.title,
      author: book.author_name?.map(name => ({ literal: name })),
      issued: { 'date-parts': [[book.first_publish_year || 2024]] },
      publisher: book.publisher?.[0] || 'Unknown Publisher'
    };

    const cite = new Cite(citationData);
    const apa = cite.format('citation', {
      template: 'apa',
      lang: 'en-US'
    });

    setCitations([{ 
      citationText: apa, 
      doiLink: null 
    }]);

    setCitation('');
    setSelectedBook(book);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('📋 Citation copied to clipboard!');
  };

  const saveCitation = (text) => {
    if (text && !savedCitations.includes(text)) {
      setSavedCitations([...savedCitations, text]);
    }
  };

  const clearBibliography = () => {
    setSavedCitations([]);
  };

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>📘 APAI</h1>
      <p><em>Instant APA 7th Edition Citation Generator</em></p>

      {/* BOOK SEARCH */}
      <input
        type="text"
        placeholder="Search for a book title..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: 12, width: '100%', marginBottom: 10, fontSize: 16 }}
      />
      <button onClick={fetchBooks} style={{ padding: 10, fontSize: 16, cursor: 'pointer', marginBottom: 20 }}>
        {loading ? 'Searching...' : 'Search Books'}
      </button>

      {/* DOI SEARCH */}
      <input
        type="text"
        placeholder="Or paste a DOI or article URL..."
        value={doiInput}
        onChange={(e) => setDoiInput(e.target.value)}
        style={{ padding: 12, width: '100%', marginBottom: 10, fontSize: 16 }}
      />
      <button onClick={fetchDOI} style={{ padding: 10, fontSize: 16, cursor: 'pointer', marginBottom: 30 }}>
        {loading ? 'Looking up DOI...' : 'Generate from DOI'}
      </button>

      {/* AI TOPIC SEARCH */}
      <div style={{ marginTop: 40 }}>
        <h2>🤖 Cite by Topic (AI Powered)</h2>
        <input
          type="text"
          placeholder="Enter a topic (e.g., climate change impact)"
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          style={{ padding: 12, width: '100%', marginBottom: 10, fontSize: 16 }}
        />
        <button
          onClick={fetchCitationByTopic}
          style={{
            padding: 10,
            fontSize: 16,
            cursor: 'pointer',
            marginBottom: 30,
            backgroundColor: '#e3f2fd',
            border: '1px solid #90caf9',
            borderRadius: 4
          }}
        >
          {loading ? 'Generating...' : 'Get Citations from AI'}
        </button>
      </div>

      {/* BOOK RESULTS */}
      {results.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h3>Select a Book:</h3>
          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {results.map((book, index) => (
              <li key={index} style={{ marginBottom: 20 }}>
                <div style={{
                  background: '#fff',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #ccc'
                }}>
                  <button
                    onClick={() => generateCitation(book)}
                    style={{
                      padding: 8,
                      width: '100%',
                      textAlign: 'left',
                      background: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    <strong>{book.title}</strong>{book.author_name ? ` — ${book.author_name.join(', ')}` : ''}
                  </button>

                  {book.key && (
                    <div style={{ marginTop: 8 }}>
                      <a
                        href={`https://openlibrary.org${book.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#388e3c', textDecoration: 'underline', fontSize: 14 }}
                      >
                        View Book 📖
                      </a>
                    </div>
                  )}

                  {selectedBook && selectedBook.key === book.key && citations.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {citations[0].citationText}
                      </p>

                      <div style={{ marginTop: 10 }}>
                        <button onClick={() => copyToClipboard(citations[0].citationText)} style={{
                          padding: '6px 10px',
                          marginRight: 10,
                          fontSize: 14,
                          cursor: 'pointer'
                        }}>
                          Copy Citation
                        </button>
                        <button onClick={() => saveCitation(citations[0].citationText)} style={{
                          padding: '6px 10px',
                          fontSize: 14,
                          cursor: 'pointer'
                        }}>
                          Save to References
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MULTIPLE CITATIONS FROM AI */}
      {citations.length > 1 && (
        <div style={{
          background: '#f9f9f9',
          padding: 20,
          borderRadius: 6,
          border: '1px solid #ddd',
          marginTop: 20
        }}>
          <h3>📚 Citation Options:</h3>
          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {citations.map((c, idx) => (
              <li key={idx} style={{ marginBottom: 20 }}>
                <div style={{
                  background: '#fff',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #ccc'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {c.citationText}
                  </p>

                  {c.doiLink && (
                    <a href={c.doiLink} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-block',
                      marginTop: 5,
                      color: '#388e3c',
                      textDecoration: 'underline'
                    }}>
                      View Article 📖
                    </a>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => copyToClipboard(c.citationText)} style={{
                      padding: '6px 10px',
                      marginRight: 10,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}>
                      Copy Citation
                    </button>
                    <button onClick={() => saveCitation(c.citationText)} style={{
                      padding: '6px 10px',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}>
                      Save to References
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* REFERENCES SECTION */}
      {savedCitations.length > 0 && (
        <div style={{
          marginTop: 40,
          background: '#fffbe6',
          padding: 20,
          border: '1px solid #ffe58f',
          borderRadius: 6
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: 20 }}>References</h2>

          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {savedCitations
              .sort((a, b) => a.localeCompare(b))
              .map((cite, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  {cite}
                </li>
              ))}
          </ul>

          <button onClick={clearBibliography} style={{
            marginTop: 20,
            padding: 8,
            fontSize: 14,
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #f44336',
            backgroundColor: '#ffebee',
            color: '#c62828'
          }}>
            Clear References
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
