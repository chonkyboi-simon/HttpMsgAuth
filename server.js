const crypto = require('crypto');
const express = require('express');
const app = express();
app.use(express.json());

const SERVER_PORT=3001;
const CSYSTEM_PAYLOAD_SECRET_KEY='abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const PAYLOAD_MAC_VERIFY_ENFORCING='false';

app.post('/perform-authorized-action',endpoint_perform_authorized_action);

app.listen(SERVER_PORT, () => {
    console.log(`Node.js server is running on port ${SERVER_PORT}`);
});

async function endpoint_perform_authorized_action(req,res) {
    const dataToSign = req.body.dataToSign;
    
    logRequest("[endpoint_perform_authorized_action]",req.body);

    //request body signature verification
    try {
        verifyHmacSignature(req,'x-csystem-signature',CSYSTEM_PAYLOAD_SECRET_KEY,'sha256');
    } catch (error) {
        console.error(`[endpoint_perform_authorized_action] Request body verification failed.`, error);
        res.status(400).send('Request body verification failed');
        return;
    }

    console.log(`[endpoint_perform_authorized_action] generating authentication token for future frontend calls`);

    if (!dataToSign) {
        console.error(`[endpoint_perform_authorized_action] dataToSign is required`);
        logResponse("[endpoint_perform_authorized_action]",{ error: 'dataToSign is required' });
        return res.status(400).send({ error: 'dataToSign is required' });
    }

    try {
        // Create JWT token with user ID payload, HMAC SHA256
        const token = jwt.sign(dataToSign, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        const response = { token: token };
        logResponse("[endpoint_perform_authorized_action]",response);
        res.status(200).send(response);
    } catch (error) {
        console.error(`[endpoint_perform_authorized_action] Failed to generate token: ${error}`);

        logResponse("[endpoint_perform_authorized_action]",{ error: 'Failed to generate token' });
        res.status(500).send({ error: 'Failed to generate token' });
    }
}

function logRequest(endpointName,request) {
    logApiCall("Request",endpointName,request);
}

function logResponse(endpointName,response) {
    logApiCall("Response",endpointName,response);
}

function logApiCall(type,endpointName,data) {
    console.log(`${endpointName} - ${type}========================================`);
    console.log(JSON.stringify(data,null,2));
}

function verifyHmacSignature(request,signatureHeaderName,hmacKey,hmacAlgorithm){
    // Get the signature from the request headers
    let expectedSignature;
    expectedSignature = request.headers[signatureHeaderName];
    if (expectedSignature==null) {
        if (PAYLOAD_MAC_VERIFY_ENFORCING == "true") {
            const errorMessage = `MAC verification is in ENFORCING mode. Request header ${signatureHeaderName} does not exist!`;
            console.error(`[verifyHmacSignature] ${errorMessage}`);
            throw new Error(errorMessage);
        } else {
            console.error(`[verifyHmacSignature] MAC verification is in PERMISSIVE mode. Request header ${signatureHeaderName} does not exist!`);
            return;
        }
    }
    
    console.log(`[verifyHmacSignature] request body:`, request.body);
    console.log(`[verifyHmacSignature] signature in header ${signatureHeaderName} in BASE64:\n${expectedSignature}`);

    // Generate the hash
    const hmac = crypto.createHmac(hmacAlgorithm, hmacKey);
    hmac.update(JSON.stringify(request.body));
    const calculatedSignature = hmac.digest('base64');
    console.log(`[verifyHmacSignature] HMAC of request payload in BASE64:\n${calculatedSignature}`);

    // Compare the generated signature with the received signature
    if (!crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(expectedSignature))) {
        //to-do update env name of the following to a generic one
        if (PAYLOAD_MAC_VERIFY_ENFORCING == "true") {
            const errorMessage = `MAC verification is in ENFORCING mode. Request payload signature verification failed, the request is declined. Calculated signature ${calculatedSignature}, expected signature ${expectedSignature}`;
            console.error(`[verifyHmacSignature] ${errorMessage}`);
            throw new Error(errorMessage);
        } else {
            console.error(`[verifyHmacSignature] MAC verification is in PERMISSIVE mode. Request payload signature verification failed, the request is fulfilled. Calculated signature ${calculatedSignature}, expected signature ${expectedSignature}`);
        }
    }
}