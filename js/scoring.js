/* Arcade singles: rally scoring to 11, win by two, sudden death at 15.
 * A line is in. Faults/out award the opponent of the last hitter.
 * The point winner serves next; scoring is idempotent outside a live rally. */
(function(B){
  'use strict';const C=B.C;
  B.landingDecision=(b,old)=>{
    if(b.y+C.shuttleRadius>=C.ground){
      const t=B.clamp((C.ground-C.shuttleRadius-old.y)/(b.y-old.y||1),0,1);
      const x=old.x+(b.x-old.x)*t;
      const out=x<C.left || x>C.right;
      return {winner:out?1-b.lastHitter:(x<C.netX?1:0),reason:out?'OUT':'ON THE FLOOR',x};
    }
    if(b.x< -160 || b.x>C.width+160)return {winner:1-b.lastHitter,reason:'OUT',x:B.clamp(b.x,15,1185)};
    return null;
  };
  B.matchWinner=scores=>{for(let i=0;i<2;i++)if((scores[i]>=11 && scores[i]-scores[1-i]>=2)||scores[i]>=15)return i;return null;};
  B.awardPoint=(g,winner,reason,x)=>{
    if(g.phase!=='rally' || (winner!==0 && winner!==1))return false;
    g.scores[winner]++;g.server=winner;g.pointWinner=winner;g.pointReason=reason;
    g.pointX=x;g.players[winner].celebrate=2;g.bestRally=Math.max(g.bestRally,g.rallyHits);
    g.cancelCharges();g.shuttle.live=false;g.timer=1.85;g.winner=B.matchWinner(g.scores);
    g.phase=g.winner===null?'point':'over';
    g.emit('point',{winner,reason});if(g.phase==='over')g.emit('over',{winner});
    return true;
  };
})(globalThis.Badminton);
