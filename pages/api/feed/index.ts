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
		getData().then(function (returnData) {
			console.log(returnData)
			res.json({
				success: true
			})
	}).catch(function (error) {
			console.error(error)
			res.status(500).json({
				success: false,
				error: {
					code: 'ERROR',
					message: error instanceof Error ? error.message : String(error),
				},
			})
		})
  }
}
