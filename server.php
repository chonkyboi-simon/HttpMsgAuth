<?php

// Include the file containing the functions and classes
require_once 'wordpress_functions.php';

$url_store_credit_system = 'http://127.0.0.1:3001';

function get_token_from_credit_service($host_url, $dataToSign, $hmacKey)
{
    $url = $host_url . '/perform-authorized-action';
	
	// Encode the body data to JSON
    $bodyData = json_encode(array(
        'dataToSign' => $dataToSign,
    ));

	// Generate the HMAC using sha256 and the provided HMAC key
    $hmacSignature = base64_encode(hash_hmac('sha256', $bodyData, $hmacKey, true));

    // Set up the headers and body for wp_remote_request
    $args = array(
        'method'  => 'POST',
        'headers' => array(
            'Content-Type' => 'application/json',
			'x-csystem-signature' => $hmacSignature, // Add the HMAC signature to the headers
        ),
        'body'    => json_encode(array(
            'dataToSign'    => $bodyData,
        )),
    );

    // Log the arguments
    // echo 'get_token_from_credit_service - Args: ' . print_r($args, true);

    try {
        // Make the POST request using wp_remote_request
        $response = wp_remote_request($url, $args);

        // Log the response
        // echo 'get_token_from_credit_service - Response: ' . print_r($response, true);

        // Check for WP_Error
        if (is_wp_error($response)) {
            // 			$error_message = $response->get_error_message();
            //     		echo "Something went wrong: $error_message";
            throw new Exception($response->get_error_message());
        }

        // Retrieve and decode the response body
        $body = wp_remote_retrieve_body($response);
        $responseData = json_decode($body, true);

        // Log the body and responseData
        // echo 'get_token_from_credit_service - Body: ' . $body;
        // echo 'get_token_from_credit_service - Response Data: ' . print_r($responseData, true);

        // Return the token if it exists
        return $responseData['token'] ?? null; // Returns null if 'token' key doesn't exist
    } catch (Exception $e) {
        // Log exceptions
        // echo 'get_token_from_credit_service - Error: ' . $e->getMessage();
        return null;
    }
}


//main entry
$current_user = wp_get_current_user();
$user_email = $current_user->user_email;
$user_id = $current_user->ID;

$dataToSign = array(
    'userEmail' => $user_email,
    'userId'    => $user_id
);

// Token obtained by WordPress for the frontend code to perform authorized actions
$token = get_token_from_credit_service($url_store_credit_system, $dataToSign,'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789');
if ($token != null) {
    echo "token=" . $token;
} else {
    echo "Error, unable to authenticate further actions";
}

