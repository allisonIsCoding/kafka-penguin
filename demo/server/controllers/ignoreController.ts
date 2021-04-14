// /* eslint-disable no-console */
// import { RequestHandler } from 'express';
// import { Ignore } from 'kafka-penguin';

// import dotenv = require('dotenv');

// dotenv.config();

// const ERROR_LOG = [];

// const MyLogCreator = (logLevel) => ({
//   namespace, label, log,
// }) => {
//   // also availabe on log object => timestamp, logger, message and more
//   const { error, correlationId } = log;
//   if (correlationId) {
//     ERROR_LOG.push(
//       `[${namespace}] Logger: kafka-penguin ${label}: ${error} correlationId: ${correlationId}`,
//     );
//   }
// };

// const DLQKafka = new Kafka({
//   clientId: 'makeClient',
//   brokers: [process.env.KAFKA_BOOTSTRAP_SERVER],
//   ssl: true,
//   sasl: {
//     mechanism: 'plain',
//     username: process.env.KAFKA_USERNAME,
//     password: process.env.KAFKA_PASSWORD,
//   },
//   logLevel: logLevel.ERROR,
//   logCreator: MyLogCreator,
// });

// const ignoreProduce: RequestHandler = (req, res, next) => {
//   const {
//     topic, message, retries, faults,
//   } = req.body;

//   const messagesArray = [];
//   // create messages array with specified number of faults
//   for (let i = 0; i < retries; i += 1) {
//     if (i < faults) messagesArray.push({ key: 'test', value: 'fault' });
//     else {
//       messagesArray.push({
//         key: 'test',
//         value: message,
//       });
//     }
//   }

//   const cb = (inputMessage: { value: Buffer }) => {
//     if (inputMessage.value.toString() === 'fault') {
//       return false;
//     } return true;
//   };

//   const admin = DLQKafka.admin();
//   const IgnoreClient = new Ignore(DLQKafka, topic, cb);
//   const IgnoreProducer = IgnoreClient.producer();
//   const IgnoreConsumer = IgnoreClient.consumer({ groupId: 'demo' });

//   res.locals.IgnoreClients = {
//     consumer: IgnoreConsumer,
//     retries,
//     faults,
//   };
//   // IgnoreProducer.logger().info('TEST', {KAFKA_PENGUIN: 'TESTING CUSTOM'})
//   IgnoreProducer.connect()
//     .then(() => {
//       IgnoreProducer.send({
//         topic,
//         messages: messagesArray,
//       }).catch((e: Error) => console.log('this is error in try', e));
//     })
//     .then(IgnoreProducer.disconnect())
//     .then(admin.connect())
//     .then(async () => {
//       const offsetData = await admin.fetchTopicOffsets(topic);
//       res.locals.latestOffset = offsetData[0].offset;
//     })
//     .then(admin.disconnect())
//     .then(() => next())
//     .catch((e: Error) => {
//       if (e.message === 'This server does not host this topic-partition') {
//         return res.status(300).json([`This error was executed as part of the kafka-penguin 
//         Ignore message reprocessing strategy.`]);
//       }
//       return next({
//         message: `Error implementing Ignore strategy, producer side:${e.message}`,
//         error: e,
//       });
//     });
// };

// const ignoreConsume: RequestHandler = (req, res, next) => {
//   const { faults, consumer, retries } = res.locals.IgnoreClients;
//   const messageLog = [];
//   consumer.connect()
//     .then(consumer.subscribe())
//     .then(() => {
//       const latestOffset = Number(res.locals.latestOffset);
//       consumer.run({
//         eachMessage: ({ topic, message }) => {
//           const messageOffset = Number(message.offset);

//           if (messageOffset >= latestOffset - retries) {
//             messageLog.push(message.value.toString());
//           }
//           if (messageLog.length === retries - faults) {
//             messageLog.push(`kafka-penguin: Error with message processing, ${faults} ${faults > 1 ? 'messages' : 'message'}
//                              ignored`);
//             res.locals.messages = messageLog;
//             consumer.disconnect()
//               .then(() => res.status(200).json(res.locals.messages))
//               .catch((e: Error) => next({
//                 message: `Error implementing Ignore strategy while consuming messages, consumer side: ${e.message}`,
//                 error: e,
//               }));
//           }
//         },
//       });
//     })
//     .catch((e: Error) => next({
//       message: `Error implementing Ignore strategy, consumer side: ${e.message}`,
//       error: e,
//     }));
// };

// export default {
//   ignoreProduce,
//   ignoreConsume,
// };
