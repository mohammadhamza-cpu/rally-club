/* The SAME racket head geometry drives rendering and collisions. Swept relative
 * motion catches fast smashes, never a magical whole-player hit radius. */
(function(B){
  'use strict';const C=B.C;
  B.segmentDistance=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay;const t=B.clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy);};
  B.racketCollision=(p,b,oldB,oldR)=>{
    if(p.swing<=0 || p.swing>.235 || p.swingConnected || b.lastHitter===p.id)return false;
    if(p.id===0?b.x>C.netX-2:b.x<C.netX+2)return false; // no reaching through the net
    const r=B.racket(p);
    // Do not reject on endpoint distance: a fast shuttle can enter AND leave
    // reach during a step. Only the swept physical head is allowed to connect.
    // Head is a circle in the collision plane, drawn as a round strung frame.
    return B.segmentDistance(0,0,oldB.x-oldR.x,oldB.y-oldR.y,b.x-r.x,b.y-r.y)<=C.racketRadius+C.shuttleRadius;
  };
  B.netCollision=(b,old)=>{
    if(b.netCooldown>0)return false;
    const low=C.netX-C.netHalf-C.shuttleRadius,high=C.netX+C.netHalf+C.shuttleRadius;
    let fraction=null;
    if(old.x<=low && b.x>=low)fraction=(low-old.x)/(b.x-old.x);
    else if(old.x>=high && b.x<=high)fraction=(high-old.x)/(b.x-old.x);
    if(fraction===null)return false;
    const y=old.y+(b.y-old.y)*fraction;
    if(y+C.shuttleRadius<C.netY)return false;
    const incoming=b.vx;
    b.x=incoming>0?low-.1:high+.1;b.y=y;
    b.vx=-incoming*.14;b.vy=Math.max(35,b.vy*.45);b.netCooldown=.15;
    return true;
  };
})(globalThis.Badminton);
