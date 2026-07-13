import { Router, type Router as ExpressRouter } from 'express';

import { openApiDocument } from './openapi.js';

const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Healthcare Appointment Manager API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`;

export const docsRouter: ExpressRouter = Router();

docsRouter.get('/', (_request, response) => {
  response.type('html').send(swaggerHtml);
});

docsRouter.get('/openapi.json', (_request, response) => {
  response.json(openApiDocument);
});
