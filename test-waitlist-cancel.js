// Test waitlist cancellation with URL decoding
const AWS = require('aws-sdk');

// Test the waitlist cancellation API
const testWaitlistCancel = async () => {
    // Set up AWS SDK
    const lambda = new AWS.Lambda({ region: 'ap-northeast-1' });
    
    // The problematic waitlistId from previous tests
    const waitlistId = "gin#2025-07-22#19:30#BB1 House 1";
    const encodedWaitlistId = encodeURIComponent(waitlistId);
    
    console.log("Original waitlistId:", waitlistId);
    console.log("URL encoded waitlistId:", encodedWaitlistId);
    
    // Create the API Gateway event payload
    const event = {
        httpMethod: 'PUT',
        path: `/waitlist/${encodedWaitlistId}`,
        pathParameters: {
            waitlistId: encodedWaitlistId
        },
        body: JSON.stringify({
            action: 'cancel',
            userId: 'test-user-id'
        })
    };
    
    try {
        console.log("Invoking Lambda function with payload:");
        console.log(JSON.stringify(event, null, 2));
        
        const result = await lambda.invoke({
            FunctionName: 'feelcycle-hub-main-dev',
            Payload: JSON.stringify(event),
            InvocationType: 'RequestResponse'
        }).promise();
        
        const response = JSON.parse(result.Payload);
        console.log("Lambda response:");
        console.log(JSON.stringify(response, null, 2));
        
        if (response.statusCode === 200) {
            console.log("✅ Waitlist cancellation succeeded!");
        } else {
            console.log("❌ Waitlist cancellation failed with status:", response.statusCode);
        }
        
    } catch (error) {
        console.error("❌ Lambda invocation failed:", error);
    }
};

// Run the test
testWaitlistCancel();