'use client';
import { useState } from 'react';

export default function Home() {

  const [txHash, setTxHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
 

  // This function is called when the button is clicked
  const analyzeTx = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // 1. Call our Python API endpoint
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_hash: txHash }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show an error if the API failed
        throw new Error(data.error || 'Something went wrong');
      }

      // 2. Store the successful result in our state
      setResult(data);
    } catch (err: any) { 
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">WhyTx</h1>
      <p className="text-lg text-gray-400 mb-8">
        The AI Rationale Engine for On-chain Actions
      </p>

      {/* --- INPUT AND BUTTON --- */}
      <div className="w-full max-w-2xl">
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste Sepolia transaction hash (e.g., 0x...)"
          className="w-full p-4 text-black rounded-lg border border-gray-600"
        />
        <button
          onClick={analyzeTx}
          disabled={isLoading}
          className="w-full p-4 mt-4 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-500"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Transaction'}
        </button>
      </div>

      {/* --- SHOW THE RESULT --- */}
      {result && (
        <div className="w-full max-w-2xl mt-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-green-400">Analysis Complete</h2>
          
          <h3 className="font-bold mt-4">Rationale:</h3>
          <p className="text-gray-300">{result.analysis.rationale}</p>
          
          <h3 className="font-bold mt-4">Key Evidence:</h3>
          <ul className="list-disc pl-5 text-gray-300">
            {result.analysis.key_evidence.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>

          <h3 className="font-bold mt-4">Lighthouse Storage CID:</h3>
          <p className="text-xs text-green-400 break-all">{result.lighthouse_cid}</p>
          <a
            href={`https://gateway.lighthouse.storage/ipfs/${result.lighthouse_cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            View Stored Rationale on Lighthouse
          </a>
        </div>
      )}

      {/* --- SHOW AN ERROR --- */}
      {error && (
        <div className="w-full max-w-2xl mt-8 bg-red-900 border border-red-700 p-6 rounded-lg">
          <h2 className="text-xl font-bold">Error</h2>
          <p>{error}</p>
        </div>
      )}
    </main>
  );
}