import serial
import serial.tools.list_ports
import time
from datetime import datetime

def find_arduino_port():
    """Auto-detect Arduino serial port"""
    print("🔍 Scanning for Arduino...")
    
    ports = list(serial.tools.list_ports.comports())
    if not ports:
        print("❌ No serial ports found")
        return None
    
    # Look for Arduino
    arduino_identifiers = ['Arduino', 'CH340', 'CP210', 'FT232', '2341:']
    
    for port in ports:
        port_info = f"{port.device} {port.description} {port.hwid}".upper()
        for identifier in arduino_identifiers:
            if identifier.upper() in port_info:
                print(f"✅ Found Arduino on {port.device}")
                return port.device
    
    # Manual selection if auto-detection fails
    print("Available ports:")
    for i, port in enumerate(ports):
        print(f"  {i}: {port.device} - {port.description}")
    
    try:
        choice = int(input("Enter port number: "))
        return ports[choice].device
    except:
        return None

def save_arduino_data(port=None, baud_rate=9600):
    """Read and save Arduino JSON data exactly as output"""
    
    # Auto-detect port if not provided
    if port is None:
        port = find_arduino_port()
        if port is None:
            return
    
    # Setup file with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"gantry_scan_{timestamp}.json"
    
    try:
        # Connect to Arduino
        arduino = serial.Serial(port, baud_rate, timeout=1)
        print(f"✅ Connected to {port}")
        time.sleep(2)  # Wait for Arduino initialization
        
        print("🔄 Collecting data... (Press Ctrl+C to stop)")
        print("-" * 60)
        
        with open(output_file, 'w') as file:
            while True:
                if arduino.in_waiting > 0:
                    # Read exactly what Arduino sends
                    line = arduino.readline().decode('utf-8').strip()
                    
                    if line:
                        # Save the exact line as Arduino outputs it
                        file.write(line + '\n')
                        file.flush()  # Ensure immediate write
                        
                        # Display the data for monitoring
                        print(line)
                
                time.sleep(0.01)
    
    except KeyboardInterrupt:
        print(f"\n🛑 Data collection stopped")
    
    except serial.SerialException as e:
        print(f"❌ Serial error: {e}")
    
    finally:
        if 'arduino' in locals() and arduino.is_open:
            arduino.close()
        print(f"📁 Arduino data saved to: {output_file}")

# Run the data collector
if __name__ == "__main__":
    save_arduino_data()
