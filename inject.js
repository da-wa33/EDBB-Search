(function() {
  window.addEventListener('message', (event) => {
    if (event.data.type === 'EBS_SPAWN_BLOCK') {
      spawnBlock(event.data.blockType);
    } else if (event.data.type === 'EBS_REQUEST_SCAN') {
      scanBlocks();
    }
  });

  const initInterval = setInterval(() => {
    const toolbox = document.getElementById('toolbox');
    if (window.Blockly && toolbox) {
      clearInterval(initInterval);
      setTimeout(scanBlocks, 1500);
    }
  }, 500);

  function scanBlocks() {
    try {
      const toolbox = document.getElementById('toolbox');
      if (!toolbox) return;

      const blockList = [];
      const headlessWs = new Blockly.Workspace();
      
      const categories = toolbox.getElementsByTagName('category');
      
      for (let cat of categories) {
        const catName = cat.getAttribute('name');
        const customAttr = cat.getAttribute('custom');
        
        if (customAttr === 'VARIABLE' || customAttr === 'PROCEDURE') continue;

        const blocks = cat.getElementsByTagName('block');
        
        for (let blkXml of blocks) {
          const type = blkXml.getAttribute('type');
          if (!type) continue;

          let label = type;
          
          try {
            const block = headlessWs.newBlock(type);
            
            let textParts = [];
            
            block.inputList.forEach(input => {
              input.fieldRow.forEach(field => {
                const txt = field.getText();
                if (txt && txt.trim() !== '') {
                  textParts.push(txt);
                }
              });
            });
            
            if (textParts.length > 0) {
              label = textParts.join(' ');
            } else {
              label = block.toString();
            }

            block.dispose();
            
          } catch (e) {}
          
          blockList.push({
            id: type,
            label: label,
            category: catName
          });
        }
      }
      
      headlessWs.dispose();
      window.postMessage({ type: 'EBS_BLOCK_LIST', blocks: blockList }, '*');
      
    } catch (err) {}
  }

  function spawnBlock(type) {
    try {
      const workspace = Blockly.getMainWorkspace();
      if (!workspace) return;

      const block = workspace.newBlock(type);
      block.initSvg();
      block.render();

      const metrics = workspace.getMetrics();
      const centerX = metrics.viewLeft + (metrics.viewWidth / 2);
      const centerY = metrics.viewTop + (metrics.viewHeight / 2);

      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;

      block.moveBy(centerX - (block.width / 2) + offsetX, centerY - (block.height / 2) + offsetY);
      
      block.select();
      Blockly.hideChaff();

    } catch (e) {
      alert('Error spawning block.');
    }
  }

})();