import { error } from '@sveltejs/kit'
import cv from '@techstark/opencv-js'
import Jimp from 'jimp'
import { promisify } from 'util'
import tf from '@tensorflow/tfjs-node'

const model = await tf.loadLayersModel('file://model.json')

export const GET = async ({ url }) => {

  try {
    let img = await Jimp.read(url.searchParams.get('url'))

    let src = cv.matFromImageData(img.bitmap)
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY)
    cv.threshold(src, src, 150, 255, cv.THRESH_BINARY_INV)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let rects = []
    for (let i = 0; i < contours.size(); i++) {
      let contour = contours.get(i)
      let boundingRect = cv.boundingRect(contour)
      rects.push(boundingRect)
    }

    rects.sort((a, b) => a.x - b.x)

    let digits = []
    for (let i = 0; i < rects.length; i++) {
      const digit = src.roi(rects[i])
      let pad = new cv.Mat(30, 30, cv.CV_8UC1, new cv.Scalar(0, 0, 0))
      let x = Math.floor((30 - digit.cols) / 2)
      let y = Math.floor((30 - digit.rows) / 2)
      let roi = pad.roi(new cv.Rect(x, y, digit.cols, digit.rows))
      digit.copyTo(roi)
      digits.push(pad)
    }

    let preds = []
    for (let i = 0; i < digits.length; i++) {
      let mat = digits[i];
      cv.cvtColor(mat, mat, cv.COLOR_BGR2RGB);
      cv.resize(mat, mat, new cv.Size(30, 30));

      let tensor = tf.tensor(mat.data, [1, 30, 30, 3])
      tensor = tensor.div(tf.scalar(255.0))

      const pred = model.predict(tensor)
      const val = pred.argMax(-1).dataSync()[0]
      preds.push(val)
    }

    return new Response(preds.join(''))

    // cv.cvtColor(src, src, cv.COLOR_GRAY2RGBA)

    // const jimpImg = new Jimp({
    //   width: src.cols,
    //   height: src.rows,
    //   data: Buffer.from(src.data)
    // })

    // const getBuffer = promisify(jimpImg.getBuffer.bind(jimpImg));
    // const buffer = await getBuffer(Jimp.MIME_PNG)
    // return new Response(buffer)

  }
  catch (err) {
    console.log(err)
    throw error(400, 'image processing issue')
  }

  throw error(400, 'some issue')
}