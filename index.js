(function main(inputFilePath = './input.asm') {
  if (!inputFilePath.endsWith('.asm')) {
    console.error('Must provide file with asm extention');
    return 1;
  }
  let fileName = inputFilePath.split('/')
  fileName = fileName[fileName.length - 1]
  fileName = fileName.split('.asm')[0]

  const fs = require('fs');
  const compTable = {
    '0' : '0101010',
    '1' : '0111111',
    '-1': '0111010',
    'D' : '0001100',
    'A' : '0110000',
    'M' : '1110000',
    '!D' : '0001101',
    '!A' : '0110001',
    '!M' : '1110001',
    '-D' : '0001111',
    '-A' : '0110011',
    '-M' : '1110011',
    'D+1' : '0011111',
    '1+D' : '0011111',
    'A+1' : '0110111',
    '1+A' : '0110111',
    'M+1' : '1110111',
    '1+M' : '1110111',
    'D-1' : '0001110',
    'A-1' : '0110010',
    'M-1' : '1110010',
    'D+A' : '0000010',
    'A+D' : '0000010',
    'D+M' : '1000010',
    'M+D' : '1000010',
    'D-A' : '0010011',
    'D-M' : '1010011',
    'A-D' : '0000111',
    'M-D' : '1000111',
    'D&A' : '0000000',
    'A&D' : '0000000',
    'D&M' : '1000000',
    'M&D' : '1000000',
    'D|A' : '0010101',
    'A|D' : '0010101',
    'D|M' : '1010101',
    'M|D' : '1010101',
  }

  const jumpTable = {
    'null' : '000',
    'JGT' : '001',
    'JEQ' : '010',
    'JGE' : '011',
    'JLT' : '100',
    'JNE' : '101',
    'JLE' : '110',
    'JMP' : '111',
  }

  let symbolTable = {
    'R0' : '0',
    'R1' : '1',
    'R2' : '2',
    'R3' : '3',
    'R4' : '4',
    'R5' : '5',
    'R6' : '6',
    'R7' : '7',
    'R8' : '8',
    'R9' : '9',
    'R10' : '10',
    'R11' : '11',
    'R12' : '12',
    'R13' : '13',
    'R14' : '14',
    'R15' : '15',
    'SCREEN' : '16384',
    'KBD' : '24576',
    'SP' : '0',
    'LCL' : '1',
    'ARG' : '2',
    'THIS' : '3',
    'THAT' : '4',
  }

  fs.readFile(inputFilePath, 'utf8', function(err, data) {
    let input = data.split('\n')
    input = input.map(removeWhitespace)
    input = input.map(removeComments)
    input = input.filter(notEmpty)
    completeSymbolTable(input)
    input = input.filter(notLabels)
    input = input.map(convertSymbolsToMemoryAddress)
    input = input.map(translate)
    console.log(input)
    fs.writeFile(fileName + '.hack', input.join('\n'), (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });
  })

  function removeWhitespace(instruction) {
    return instruction.replace(/\s/g, '');
  }

  function removeComments(instruction) {
    return instruction.split('//')[0];
  }

  function notEmpty(instruction) {
    return instruction
  }

  function completeSymbolTable(instructions) {
    let instructionCounter = 0;
    instructions.forEach((instruction) => {
      if (RegExp(/^[(][a-zA-Z_$][a-zA-Z_.$0-9]*[)]$/g).test(instruction)) {
        let symbol = instruction.split('(')[1].split(')')[0];
        symbolTable[symbol] = instructionCounter;
      }
      else {
        instructionCounter++
      }
    })

    let ramCounter = 16;
    instructions.forEach((instruction) => {
      if (RegExp(/^[@][a-zA-Z_$][a-zA-Z_.$0-9]*$/g).test(instruction)) {
        let symbol = instruction.split('@')[1];
        if (! symbolTable[symbol]) {
          symbolTable[symbol] = ramCounter.toString()
          ramCounter++;
        }
      }
    })
  }

  function notLabels(instruction) {
    return ! (RegExp(/^[(][a-zA-Z_$][a-zA-Z_.$0-9]*[)]$/g).test(instruction))
  }

  function convertSymbolsToMemoryAddress(instruction) {
    if (RegExp(/^[@][a-zA-Z_$][a-zA-Z_.$0-9]*$/g).test(instruction)) {
      let symbolAddress = symbolTable[instruction.split('@')[1]];
      return '@' + symbolAddress
    }
    else {
      return instruction
    }
  }

  function getInstructionType(instruction) {
    let retval;
    if (RegExp(/^@\d+$/g).test(instruction)) {return 0}
    else if (RegExp(/^(?:(?=[AMD])(A?M?D?)=)?([AMD][+\-&|][AMD1]|[\-!]?[AMD01])(?:;J([GL][ET]|EQ|NE|MP))?$/g).test(instruction)) {return 1}
    else {return -1}
  }

  function translate(instruction) {
    if (getInstructionType(instruction) == 0) {
      return translateAInstruction(instruction)
    }
    else if (getInstructionType(instruction) == 1) {
      return translateCInstruction(instruction)
    }
    else {
      return instruction //maybe some kind of error handling here
    }
  }

  function translateAInstruction(instruction) {
    let binary = new Number(instruction.split('@')[1]).toString(2);
    if (binary.length > 15) {
      binary = binary.substring(binary.length - 15, binary.length)
    }
    else if (binary.length < 15) {
      binary = '0'.repeat(15-binary.length) + binary
    }
    return '0' + binary;
  }

  function translateCInstruction(instruction) {
    let binary = '111';
    let jump;
    let dest;
    let comp;
    instruction = instruction.split(';')
    instruction[0] = instruction[0].split('=')
    if (instruction.length == 2) { //jump portion exists
      jump = instruction[1]
    }

    comp = instruction[0][0]

    if (instruction[0].length == 2) { //dest portion exists
      dest = instruction[0][0]
      comp = instruction[0][1]
    }

    binary += compTable[comp]
    if (dest) {
      binary += dest.includes('A') ? '1' : '0'
      binary += dest.includes('D') ? '1' : '0'
      binary += dest.includes('M') ? '1' : '0'
    }
    else {
      binary += '000';
    }

    if (jump) {
      binary += jumpTable[jump]
    }
    else {
      binary += '000'
    }
    return binary
  }

})(process.argv[2])
