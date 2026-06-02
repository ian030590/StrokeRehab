import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Brain, Download } from 'lucide-react';
import { initJsPsych } from 'jspsych';

const CognitiveTherapy = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const jsPsychRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const targetsLeftRef = useRef(0);
  
  useEffect(() => {
    // Initialize jsPsych
    jsPsychRef.current = initJsPsych({
      display_element: 'jspsych-target',
    });
    
    startTimeRef.current = performance.now();
    jsPsychRef.current.data.write({
      trial_type: 'cognitive-scanning-start',
      time: startTimeRef.current,
    });

    const initPixi = async () => {
      const app = new PIXI.Application();
      await app.init({ width: 700, height: 500, backgroundColor: 0x1e293b });
      appRef.current = app;
      if (pixiContainer.current) {
        pixiContainer.current.appendChild(app.canvas);
      }

      let targetsCount = 0;
      
      for (let i = 0; i < 20; i++) {
        const isTarget = Math.random() > 0.5;
        if (isTarget) targetsCount++;
        
        const item = new PIXI.Graphics();
        
        item.eventMode = 'static';
        item.cursor = 'pointer';
        item.x = Math.random() * 600 + 50;
        item.y = Math.random() * 400 + 50;

        if (isTarget) {
          item.circle(0, 0, 20);
          item.fill(0x10b981);
        } else {
          item.rect(-20, -20, 40, 40);
          item.fill(0xef4444);
        }

        item.on('pointerdown', () => {
          const rt = performance.now() - startTimeRef.current;
          jsPsychRef.current.data.write({
            trial_type: 'item-click',
            is_target: isTarget,
            rt: rt,
          });

          if (isTarget) {
            item.visible = false;
            scoreRef.current += 1;
            targetsLeftRef.current -= 1;
            setScore(scoreRef.current);
            
            if (targetsLeftRef.current <= 0) {
              setGameOver(true);
              jsPsychRef.current.data.write({
                trial_type: 'game-over',
                final_score: scoreRef.current,
                total_time: performance.now() - startTimeRef.current,
              });
            }
          }
        });

        app.stage.addChild(item);
      }
      
      targetsLeftRef.current = targetsCount;
      if (targetsCount === 0) setGameOver(true);
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

  const exportData = () => {
    if (jsPsychRef.current) {
      const csv = jsPsychRef.current.data.get().csv();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cognitive_therapy_data.csv';
      a.click();
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Brain size={32} color="var(--secondary-hover)" />
        <h1>認知神經功能復健</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          視覺注意力掃描訓練：請點擊所有的綠色圓圈（目標），忽略紅色方塊。
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>得分: {score}</h2>
          <button className="btn btn-secondary" onClick={exportData}>
            <Download size={20} /> 匯出 jsPsych 數據
          </button>
        </div>

        <div className="canvas-container" style={{ display: 'flex', justifyContent: 'center', background: '#1e293b' }}>
          <div id="jspsych-target" style={{ display: 'none' }}></div>
          <div ref={pixiContainer}></div>
        </div>
        
        {gameOver && (
          <div style={{ marginTop: '2rem', color: 'var(--accent-color)', fontSize: '1.5rem', fontWeight: 'bold' }}>
            🎉 訓練完成！您找出了所有目標。
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitiveTherapy;
