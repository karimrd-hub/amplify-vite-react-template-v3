// src/services/stepFunctionService.ts

const STEP_FUNCTION_API_ENDPOINT = 'https://eby9ngcjr6.execute-api.eu-west-1.amazonaws.com/dev/trigger-step-function-textual-info-ocr';
const STATE_MACHINE_ARN = 'arn:aws:states:eu-west-1:363941815773:stateMachine:Idara-ocr-component';

export interface StepFunctionInput {
  bucket: string;
  key_front: string;
  key_back?: string;
}

export interface StartExecutionPayload {
  stateMachineArn: string;
  input: string;
}

export interface StartExecutionResponse {
  executionArn: string;
  startDate: number;
}

export interface ExecutionResult {
  status: 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED' | 'RUNNING';
  output?: any;
  error?: string;
}

/**
 * Starts Step Function execution
 */
export const startStepFunction = async (
  s3Key: string,
  keyBack?: string
): Promise<StartExecutionResponse> => {
  const input: StepFunctionInput = {
    bucket: 'idara-save-identity-documents-images',
    key_front: s3Key,
    ...(keyBack && { key_back: keyBack })
  };

  const payload: StartExecutionPayload = {
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify(input)
  };

  try {
    const response = await fetch(STEP_FUNCTION_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Step Function start failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Step Function API Error:', error);
    throw error;
  }
};

/**
 * Polls for Step Function execution result
 * Note: You'll need an API Gateway endpoint that calls DescribeExecution
 */
export const getExecutionResult = async (
  executionArn: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<ExecutionResult> => {
  const DESCRIBE_EXECUTION_ENDPOINT = 'YOUR_DESCRIBE_EXECUTION_ENDPOINT'; // You'll need this endpoint
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(DESCRIBE_EXECUTION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ executionArn }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get execution status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status !== 'RUNNING') {
        return result;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error('Error polling execution:', error);
      if (attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error('Step Function execution timed out');
};