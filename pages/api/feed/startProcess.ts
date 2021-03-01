import { NextApiRequest, NextApiResponse } from 'next'
import getData from './core'
export default (req: NextApiRequest, res: NextApiResponse) => {
  if (req.query.error) {
    res.status(422).json({
      success: false,
      error: {
        code: 'ERROR',
        message: req.query.error,
      },
    })
  } else {
		getData().then(function (xmlData) {
			res.setHeader("Content-Type", "text/xml");
			res.setDefaultEncoding("utf8");
			res.write(xmlData);
			res.end();
		})
  }
}
