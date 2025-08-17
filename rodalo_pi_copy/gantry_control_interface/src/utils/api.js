const API_BASE_URL = 'http://localhost:3001/api';

export const sendCommand = async (command, value = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/gantry/${command}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export const getStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/gantry/status`);
    return await response.json();
  } catch (error) {
    console.error('Status check failed:', error);
    throw error;
  }
};
