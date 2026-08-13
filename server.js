const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// Carrega o Standard-Json-Input uma vez quando o servidor liga
const standardInputPath = path.join(__dirname, 'standard-input.json');
const standardInput = JSON.parse(fs.readFileSync(standardInputPath, 'utf8'));

app.post('/api/verify-token', async (req, res) => {
    const { address, name, symbol, decimals, initialSupply, owner, mintEnabled, burnEnabled } = req.body;

    if (!address || !name || !symbol || !owner) {
        return res.status(400).json({ error: 'Dados incompletos.' });
    }

    try {
        console.log(`Iniciando verificação para o contrato: ${address}`);

        // 1. Formatar os argumentos do construtor em ABI (hex)
        const ethers = require('ethers');
        const abiCoder = new ethers.AbiCoder();
        const constructorArgs = abiCoder.encode(
            ['string', 'string', 'uint8', 'uint256', 'address', 'bool', 'bool'],
            [name, symbol, decimals, initialSupply, owner, mintEnabled, burnEnabled]
        );

        // 2. Montar o payload para a API da Etherscan
        const payload = {
            apikey: ETHERSCAN_API_KEY,
            module: 'contract',
            action: 'verifysourcecode',
            contractaddress: address,
            sourceCode: JSON.stringify(standardInput),
            codeformat: 'solidity-standard-json-input',
            contractname: 'BogaERC20Token.sol:BogaERC20Token',
            compilerversion: 'v0.8.28+commit.7891f434',
            optimizationUsed: '1',
            runs: '1',
            constructorArguvi: constructorArgs.slice(2), // Remove o "0x" do início
            license: 'MIT'
        };

        // 3. Enviar para a Etherscan
        const formData = new URLSearchParams();
        for (const key in payload) {
            formData.append(key, payload[key]);
        }

        const response = await fetch('https://api.etherscan.io/v2/api?chainid=137', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        console.log('Resposta da Etherscan:', data);

        if (data.status === '1') {
            res.json({ success: true, message: 'Verificação enviada com sucesso. Aguarde o processamento da Etherscan.' });
        } else {
            res.status(400).json({ success: false, error: data.result });
        }

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Listener rodando na porta ${PORT}`);
});