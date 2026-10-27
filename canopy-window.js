// Only the vegetation's own pixels are faded; terrain and actors are never erased.
export const CANOPY_RADIUS=130,CANOPY_CORE=85,CANOPY_OPACITY=.08;
export function canopyIntersects(bounds,player,radius=CANOPY_RADIUS){const x=player.x,y=player.y-28,dx=x-Math.max(bounds.left,Math.min(x,bounds.right)),dy=y-Math.max(bounds.top,Math.min(y,bounds.bottom));return dx*dx+dy*dy<radius*radius;}
export class CanopyWindow{
 constructor(createCanvas=()=>document.createElement('canvas')){this.createCanvas=createCanvas;this.canvas=null;}
 draw(c,draw,bounds,player){if(!canopyIntersects(bounds,player)){draw(c);return;}
  const left=Math.floor(bounds.left)-2,top=Math.floor(bounds.top)-2,w=Math.ceil(bounds.right-left)+2,h=Math.ceil(bounds.bottom-top)+2;
  const image=this.canvas??=this.createCanvas();if(image.width<w)image.width=w;if(image.height<h)image.height=h;const layer=image.getContext('2d');
  layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,image.width,image.height);layer.save();layer.translate(-left,-top);draw(layer);
  layer.globalCompositeOperation='destination-out';const x=player.x,y=player.y-28,g=layer.createRadialGradient(x,y,CANOPY_CORE,x,y,CANOPY_RADIUS);g.addColorStop(0,'rgba(0,0,0,'+(1-CANOPY_OPACITY)+')');g.addColorStop(1,'rgba(0,0,0,0)');layer.fillStyle=g;layer.fillRect(left,top,w,h);layer.restore();
  c.save();c.imageSmoothingEnabled=false;c.drawImage(image,0,0,w,h,left,top,w,h);c.restore();
 }
}
