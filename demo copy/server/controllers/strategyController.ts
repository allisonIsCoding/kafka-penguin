import { RequestHandler } from 'express'
import { Kafka, logLevel } from 'kafkajs';
const kafkaPenguin = require('kafka-penguin');
import dotenv = require('dotenv')
dotenv.config();
//cache to store error logs
let ERROR_LOG = []

const MyLogCreator = logLevel => ({ namespace, level, label, log }) => {
  //also availabe on log object => timestamp, logger, message and more
  const { error, correlationId } = log
  ERROR_LOG.push(`[${namespace}] Logger: kafka-penguin ${label}: ${error} correlationId: ${correlationId}`)
}
//new kafka instance with logCreator added
const strategyKafka = new Kafka({
  clientId: 'makeClient',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  },
  logLevel: logLevel.ERROR,
  logCreator: MyLogCreator, 
});

const failfast: RequestHandler = (req, res, next) => { 
  const strategies = kafkaPenguin.failfast;
  const newStrategy = new strategies.FailFast(req.body.retries - 1, strategyKafka);
  const producer = newStrategy.producer();
  const message = {
    topic: req.body.topic,
    messages: [
      {
        key: 'hello',
        value: req.body.message,
      }
    ]
  };
  producer.connect()
    .then(() => console.log('Connected'))
    .then(() => producer.send(message))
    .then(() => {  
      if (ERROR_LOG.length > 0) {
        const plural = req.body.retries > 1 ? 'times' : 'time'
        ERROR_LOG.push(`kafka-penguin: FailFast stopped producer after ${req.body.retries} ${plural}!`)
        res.locals.error = [...ERROR_LOG]
      } else res.locals.error = ['kafka-penguin: Message produced successfully']
      ERROR_LOG = [];
      return next();
    })
    .catch(e => {
      return next({
        message: 'Error implementing FailFast strategy: ' + e.message,
        error: e
      })
    });
};

export default {
  failfast,
}