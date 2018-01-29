#script to convert downloaded test json data that was not formatted properly
#converts keys to strings, to be json compliant

f = open('sampleData.json', 'r')
fw= open('newSample.json', 'w')

for line in f.readlines():
    if ":" in line and line[0].isalpha():
        splitNum = line.index(":")
        fw.write("\""+line[0:splitNum]+"\""+line[splitNum:])
    elif ":" in line and line[0].isdigit():
            splitNum = line.index(":")
            fw.write("\""+line[0:splitNum]+"\""+line[splitNum:])
    else:
        fw.write(line)
