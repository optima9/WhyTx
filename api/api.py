from flask import Flask, request, jsonify
from web3 import Web3
from openai import OpenAI
from lighthouseweb3 import Lighthouse
import os
import json

# Initialize Flask app
app = Flask(__name__)

RPC_URL = os.environ.get('RPC_URL')
OPENAI_KEY = os.environ.get('OPENAI_KEY')
LIGHTHOUSE_KEY = os.environ.get('LIGHTHOUSE_KEY')

# Initialize all the clients our agent needs
w3 = Web3(Web3.HTTPProvider(RPC_URL))
client = OpenAI(api_key=OPENAI_KEY)
lh = Lighthouse(token=LIGHTHOUSE_KEY)


@app.route('/api/analyze', methods=['POST'])
def analyze_transaction():
    try:
        # 1. Get the transaction hash from the frontend
        data = request.json
        tx_hash = data.get('tx_hash')

        if not tx_hash:
            return jsonify({"error": "tx_hash is required"}), 400

    

        tx_data = w3.eth.get_transaction(tx_hash)
        tx_receipt = w3.eth.get_transaction_receipt(tx_hash)

        # Convert the complex Web3 data into simple text for the AI
        # This is a simple way to "show" the data to the LLM
        tx_info = {
            "transaction": json.loads(Web3.to_json(tx_data)),
            "receipt": json.loads(Web3.to_json(tx_receipt))
        }
        
     
        prompt = f"""
        You are "WhyTx", a blockchain analysis AI. Your job is to explain a transaction in simple terms.
        Analyze the following transaction and receipt JSON data:
        {json.dumps(tx_info)}

        Return a JSON object with this *exact* structure:
        {{
          "rationale": "A 2-sentence human-readable story of what happened and why.",
          "key_evidence": [
            "A bullet point of the most important action.",
            "Another bullet point, e.g., 'From: [address]'",
            "Another bullet point, e.g., 'To: [contract_name or address]'",
            "Another bullet point, e.g., 'Tokens Transferred: [amount and name]'"
          ],
          "confidence": 95
        }}
        """

        # Send the prompt to the AI and ask for a JSON response
        completion = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a helpful blockchain analyst that only responds in JSON."},
                {"role": "user", "content": prompt}
            ]
        )


        ai_response_json = json.loads(completion.choices[0].message.content)

        
        temp_file_path = f"/tmp/{tx_hash}.json"
        with open(temp_file_path, 'w') as f:
            json.dump(ai_response_json, f)
            
 
        upload_response = lh.upload(source=temp_file_path, tag=tx_hash)
        # The 'Hash' is the CID (Content Identifier)
        cid = upload_response.get('Hash')
        
        # Clean up the temp file
        os.remove(temp_file_path)

        final_response = {
            "analysis": ai_response_json,
            "lighthouse_cid": cid
        }
        
        return jsonify(final_response)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run()