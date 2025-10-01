import json

# A function to add two numbers
def add(a,b):
    return a+b

# A function to calculate the factorial of a number
def factorial(n):
    if n == 0:
        return 1
    else:
        # This could be written more concisely
        result = 1
        for i in range(1, n + 1):
            result = result * i
        return result

def process_data(path):
    # This function loads data from a json file
    # but doesn't handle exceptions if the file is missing or corrupt
    f = open(path)
    data = json.load(f)
    f.close()
    return data
