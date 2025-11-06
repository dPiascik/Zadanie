import { Fill, Icon, Stroke, Style } from "ol/style";

export const polygonStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 0, 0, 0.2)',
  }),
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
})

export const iconStyle = (azimuth: number, iconSrc: string) => new Style({
  image: new Icon({
    src: iconSrc,
    width: 50,
    rotation: -azimuth * (Math.PI / 180),
    rotateWithView: true,
  }),
});
