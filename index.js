const { Command } = require('commander');
const http = require('http');
const { promises: fs } = require('fs');
const { XMLBuilder } = require('fast-xml-parser');
const url = require('url');

const program = new Command();
program
  .requiredOption('-i, --input <path>', 'шлях до файлу для читання')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера');

program.parse(process.argv);
const options = program.opts();

const server = http.createServer(async (req, res) => {
  try {
    const inputPath = options.input;
    if (typeof inputPath !== 'string') {
      throw new Error('Неправильно вказано шлях до файлу.');
    }

    const jsonData = await fs.readFile(inputPath, 'utf-8');
    const carsData = JSON.parse(jsonData);

    const parsedUrl = url.parse(req.url, true);
    const showCylinders = parsedUrl.query.cylinders === 'true';
    const maxMpg = parseFloat(parsedUrl.query.max_mpg);

    let filteredCars = carsData;
    if (!isNaN(maxMpg)) {
      filteredCars = filteredCars.filter(car => car.mpg < maxMpg);
    }
    
    // Правильне формування об'єкта з одним кореневим елементом <cars>
    const dataForXml = {
      cars: {
        car: filteredCars.map(car => {
          const carObject = {
            model: car.model,
            mpg: car.mpg
          };
          if (showCylinders && car.cyl !== undefined) {
            carObject.cyl = car.cyl;
          }
          return carObject;
        })
      }
    };
    
    // Налаштування для XMLBuilder
    const builder = new XMLBuilder({
        attributeNamePrefix : "@_",
        textNodeName : "#text",
        ignoreAttributes : true,
        cdataTagName: "__cdata",
        format: true,
        indentBy: "  "
    });
    
    const xmlContent = builder.build(dataForXml);

    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(xmlContent);

  } catch (error) {
    console.error('Виникла помилка:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Внутрішня помилка сервера');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено за адресою http://${options.host}:${options.port}/`);
});