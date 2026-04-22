// 游戏核心系统
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particleCanvas = document.getElementById('particle-canvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.currentWave = 1;
        this.waveInProgress = false;
        
        // 网格系统
        this.gridSize = 50;
        this.gridCols = 16;
        this.gridRows = 12;
        
        // 资源系统
        this.energy = 100;
        this.crystals = 0;
        this.totalCrystalsCollected = 0;
        
        // 单位系统
        this.drones = [];
        this.enemies = [];
        this.crystalNodes = [];
        this.projectiles = [];
        this.particles = [];
        
        // 选中状态
        this.selectedDroneType = null;
        this.selectedFormation = 'spread';
        this.selectedSkill = null;
        
        // 技能冷却
        this.skillCooldowns = {
            'orbital-laser': 0,
            'emp': 0,
            'shield': 0,
            'reinforcement': 0
        };
        
        // 游戏统计
        this.totalKills = 0;
        
        // 初始化
        this.setupCanvas();
        this.setupEventListeners();
        this.initGame();
    }
    
    setupCanvas() {
        const container = document.getElementById('game-canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.particleCanvas.width = container.clientWidth;
        this.particleCanvas.height = container.clientHeight;
    }
    
    initGame() {
        this.drones = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.energy = 100;
        this.crystals = 0;
        this.totalCrystalsCollected = 0;
        this.totalKills = 0;
        this.currentWave = 1;
        this.waveInProgress = false;
        
        this.skillCooldowns = {
            'orbital-laser': 0,
            'emp': 0,
            'shield': 0,
            'reinforcement': 0
        };
        
        this.generateCrystalNodes();
        this.updateUI();
    }
    
    generateCrystalNodes() {
        this.crystalNodes = [];
        const crystalCount = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < crystalCount; i++) {
            const col = Math.floor(Math.random() * (this.gridCols - 4)) + 2;
            const row = Math.floor(Math.random() * (this.gridRows - 4)) + 2;
            
            const overlaps = this.crystalNodes.some(node => 
                Math.abs(node.col - col) < 3 && Math.abs(node.row - row) < 3
            );
            
            if (!overlaps) {
                this.crystalNodes.push({
                    col: col,
                    row: row,
                    x: col * this.gridSize + this.gridSize / 2,
                    y: row * this.gridSize + this.gridSize / 2,
                    health: 100,
                    maxHealth: 100,
                    crystalValue: 20 + Math.floor(Math.random() * 20)
                });
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => {
            document.getElementById('start-menu').classList.add('hidden');
            this.gameState = 'playing';
            this.initGame();
            this.log('游戏开始！部署无人机准备防御。');
        });
        
        document.getElementById('show-tutorial').addEventListener('click', () => {
            document.getElementById('tutorial-panel').classList.remove('hidden');
        });
        
        document.getElementById('close-tutorial').addEventListener('click', () => {
            document.getElementById('tutorial-panel').classList.add('hidden');
        });
        
        document.getElementById('restart-game').addEventListener('click', () => {
            document.getElementById('game-over-panel').classList.add('hidden');
            this.gameState = 'playing';
            this.initGame();
            this.log('游戏重新开始！');
        });
        
        document.querySelectorAll('.drone-type').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedDroneType = btn.dataset.type;
                this.selectedSkill = null;
                document.querySelectorAll('.drone-type').forEach(b => b.classList.remove('selected'));
                document.querySelectorAll('.skill').forEach(s => s.classList.remove('selected'));
                btn.classList.add('selected');
                this.log(`已选择: ${this.getDroneTypeName(btn.dataset.type)}无人机`);
            });
        });
        
        document.querySelectorAll('.formation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedFormation = btn.dataset.formation;
                document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyFormation();
                this.log(`编队切换为: ${this.getFormationName(btn.dataset.formation)}`);
            });
        });
        
        document.querySelector('.formation-btn[data-formation="spread"]').classList.add('active');
        
        document.querySelectorAll('.skill').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('on-cooldown')) return;
                
                this.selectedSkill = btn.dataset.skill;
                this.selectedDroneType = null;
                document.querySelectorAll('.skill').forEach(s => s.classList.remove('selected'));
                document.querySelectorAll('.drone-type').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.log(`已选择技能: ${this.getSkillName(btn.dataset.skill)}`);
            });
        });
        
        document.getElementById('start-wave').addEventListener('click', () => {
            if (!this.waveInProgress && this.gameState === 'playing') {
                this.startWave();
            }
        });
        
        document.getElementById('pause-game').addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.gameState = 'paused';
                document.getElementById('pause-game').textContent = '继续';
                document.getElementById('game-status').textContent = '已暂停';
                this.log('游戏已暂停');
            } else if (this.gameState === 'paused') {
                this.gameState = 'playing';
                document.getElementById('pause-game').textContent = '暂停';
                document.getElementById('game-status').textContent = '游戏中';
                this.log('游戏继续');
            }
        });
        
        document.getElementById('speed-up').addEventListener('click', () => {
            if (this.gameSpeed === 1) {
                this.gameSpeed = 2;
                document.getElementById('speed-up').classList.add('active');
                this.log('游戏速度: 2x');
            } else {
                this.gameSpeed = 1;
                document.getElementById('speed-up').classList.remove('active');
                this.log('游戏速度: 1x');
            }
        });
        
        document.getElementById('execute-program').addEventListener('click', () => {
            const program = document.getElementById('program-input').value;
            this.executeProgram(program);
        });
        
        document.getElementById('clear-program').addEventListener('click', () => {
            document.getElementById('program-input').value = '';
            this.log('编程控制台已清空');
        });
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    getDroneTypeName(type) {
        const names = {
            'scout': '侦察型',
            'combat': '战斗型',
            'support': '支援型'
        };
        return names[type] || type;
    }
    
    getFormationName(formation) {
        const names = {
            'spread': '分散',
            'line': '线形',
            'circle': '圆形',
            'phalanx': '方阵'
        };
        return names[formation] || formation;
    }
    
    getSkillName(skill) {
        const names = {
            'orbital-laser': '轨道激光',
            'emp': '电磁脉冲',
            'shield': '量子护盾',
            'reinforcement': '紧急增援'
        };
        return names[skill] || skill;
    }
    
    handleCanvasClick(e) {
        if (this.gameState !== 'playing') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.selectedSkill) {
            this.useSkill(this.selectedSkill, x, y);
            return;
        }
        
        if (this.selectedDroneType) {
            this.placeDrone(x, y);
        }
    }
    
    placeDrone(x, y) {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);
        
        if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
            this.log('无法在此位置放置无人机');
            return;
        }
        
        const cost = this.getDroneCost(this.selectedDroneType);
        if (this.energy < cost) {
            this.log('能量不足！');
            return;
        }
        
        const overlap = this.drones.some(drone => 
            Math.abs(drone.col - col) < 1 && Math.abs(drone.row - row) < 1
        );
        
        if (overlap) {
            this.log('此位置已有无人机');
            return;
        }
        
        this.energy -= cost;
        const drone = this.createDrone(this.selectedDroneType, col, row);
        this.drones.push(drone);
        
        this.createPlacementEffect(x, y);
        this.updateUI();
        this.log(`部署了一架${this.getDroneTypeName(this.selectedDroneType)}无人机`);
    }
    
    createDrone(type, col, row) {
        const stats = this.getDroneStats(type);
        return {
            type: type,
            col: col,
            row: row,
            x: col * this.gridSize + this.gridSize / 2,
            y: row * this.gridSize + this.gridSize / 2,
            targetX: null,
            targetY: null,
            health: stats.health,
            maxHealth: stats.health,
            damage: stats.damage,
            range: stats.range,
            speed: stats.speed,
            attackCooldown: 0,
            isSelected: false,
            hasShield: false,
            shieldTimer: 0
        };
    }
    
    getDroneStats(type) {
        const stats = {
            'scout': { health: 50, damage: 8, range: 100, speed: 3 },
            'combat': { health: 100, damage: 20, range: 120, speed: 1.5 },
            'support': { health: 60, damage: 5, range: 150, speed: 2 }
        };
        return stats[type];
    }
    
    getDroneCost(type) {
        const costs = {
            'scout': 20,
            'combat': 50,
            'support': 30
        };
        return costs[type];
    }
    
    applyFormation() {
        if (this.drones.length === 0) return;
        
        const centerX = this.drones.reduce((sum, d) => sum + d.x, 0) / this.drones.length;
        const centerY = this.drones.reduce((sum, d) => sum + d.y, 0) / this.drones.length;
        
        switch (this.selectedFormation) {
            case 'spread':
                this.drones.forEach((drone, i) => {
                    const angle = (i / this.drones.length) * Math.PI * 2;
                    const distance = 60 + Math.random() * 40;
                    drone.targetX = centerX + Math.cos(angle) * distance;
                    drone.targetY = centerY + Math.sin(angle) * distance;
                });
                break;
                
            case 'line':
                this.drones.forEach((drone, i) => {
                    const offset = (i - this.drones.length / 2) * 40;
                    drone.targetX = centerX + offset;
                    drone.targetY = centerY;
                });
                break;
                
            case 'circle':
                const radius = 50 + this.drones.length * 5;
                this.drones.forEach((drone, i) => {
                    const angle = (i / this.drones.length) * Math.PI * 2;
                    drone.targetX = centerX + Math.cos(angle) * radius;
                    drone.targetY = centerY + Math.sin(angle) * radius;
                });
                break;
                
            case 'phalanx':
                const cols = Math.ceil(Math.sqrt(this.drones.length));
                this.drones.forEach((drone, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    drone.targetX = centerX + (col - cols / 2) * 40;
                    drone.targetY = centerY + (row - Math.ceil(this.drones.length / cols) / 2) * 40;
                });
                break;
        }
    }
    
    startWave() {
        this.waveInProgress = true;
        document.getElementById('game-status').textContent = '战斗中';
        this.log(`波次 ${this.currentWave} 开始！敌人来袭！`);
        
        const enemyCount = 3 + this.currentWave * 2;
        this.spawnEnemies(enemyCount);
        
        this.createWaveEffect();
    }
    
    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    const side = Math.floor(Math.random() * 4);
                    let x, y;
                    
                    switch (side) {
                        case 0:
                            x = Math.random() * this.canvas.width;
                            y = -30;
                            break;
                        case 1:
                            x = this.canvas.width + 30;
                            y = Math.random() * this.canvas.height;
                            break;
                        case 2:
                            x = Math.random() * this.canvas.width;
                            y = this.canvas.height + 30;
                            break;
                        case 3:
                            x = -30;
                            y = Math.random() * this.canvas.height;
                            break;
                    }
                    
                    const enemyType = Math.random() > 0.7 ? 'heavy' : 'basic';
                    const stats = this.getEnemyStats(enemyType);
                    
                    this.enemies.push({
                        type: enemyType,
                        x: x,
                        y: y,
                        health: stats.health * (1 + this.currentWave * 0.1),
                        maxHealth: stats.health * (1 + this.currentWave * 0.1),
                        damage: stats.damage * (1 + this.currentWave * 0.05),
                        speed: stats.speed,
                        attackCooldown: 0,
                        stunned: false,
                        stunTimer: 0
                    });
                }
            }, i * 800);
        }
    }
    
    getEnemyStats(type) {
        const stats = {
            'basic': { health: 30, damage: 10, speed: 1.5 },
            'heavy': { health: 80, damage: 20, speed: 0.8 }
        };
        return stats[type];
    }
    
    useSkill(skill, x, y) {
        switch (skill) {
            case 'orbital-laser':
                if (this.crystals < 100) {
                    this.log('晶石不足！');
                    return;
                }
                this.crystals -= 100;
                this.skillCooldowns['orbital-laser'] = 30;
                this.orbitalLaser(x, y);
                break;
                
            case 'emp':
                if (this.energy < 150) {
                    this.log('能量不足！');
                    return;
                }
                this.energy -= 150;
                this.skillCooldowns['emp'] = 20;
                this.emp(x, y);
                break;
                
            case 'shield':
                if (this.energy < 80) {
                    this.log('能量不足！');
                    return;
                }
                this.energy -= 80;
                this.skillCooldowns['shield'] = 25;
                this.activateShield();
                break;
                
            case 'reinforcement':
                if (this.crystals < 200) {
                    this.log('晶石不足！');
                    return;
                }
                this.crystals -= 200;
                this.skillCooldowns['reinforcement'] = 40;
                this.reinforcement();
                break;
        }
        
        this.selectedSkill = null;
        document.querySelectorAll('.skill').forEach(s => s.classList.remove('selected'));
        this.updateUI();
    }
    
    orbitalLaser(x, y) {
        this.createLaserEffect(x, y);
        
        this.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist < 150) {
                enemy.health -= 100;
                this.createDamageEffect(enemy.x, enemy.y);
            }
        });
        
        this.crystalNodes.forEach(crystal => {
            const dist = Math.hypot(crystal.x - x, crystal.y - y);
            if (dist < 150) {
                crystal.health -= 50;
            }
        });
        
        this.log('轨道激光发射！');
    }
    
    emp(x, y) {
        this.createEMPEffect(x, y);
        
        this.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - x, enemy.y - y);
            if (dist < 200) {
                enemy.stunned = true;
                enemy.stunTimer = 180;
            }
        });
        
        this.log('电磁脉冲释放！敌人已瘫痪！');
    }
    
    activateShield() {
        this.drones.forEach(drone => {
            drone.hasShield = true;
            drone.shieldTimer = 300;
        });
        
        this.createShieldEffect();
        this.log('量子护盾已激活！');
    }
    
    reinforcement() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * 100;
            const y = centerY + Math.sin(angle) * 100;
            const col = Math.floor(x / this.gridSize);
            const row = Math.floor(y / this.gridSize);
            
            const drone = this.createDrone('combat', col, row);
            drone.x = x;
            drone.y = y;
            this.drones.push(drone);
            
            this.createPlacementEffect(x, y);
        }
        
        this.log('紧急增援到达！3架战斗型无人机已部署！');
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        for (let skill in this.skillCooldowns) {
            if (this.skillCooldowns[skill] > 0) {
                this.skillCooldowns[skill] -= deltaTime / 1000;
                if (this.skillCooldowns[skill] <= 0) {
                    this.skillCooldowns[skill] = 0;
                }
            }
        }
        this.updateSkillUI();
        
        this.updateDrones(deltaTime);
        this.updateEnemies(deltaTime);
        this.updateProjectiles(deltaTime);
        this.updateParticles(deltaTime);
        this.checkCollisions();
        this.checkWaveStatus();
        this.updateUI();
    }
    
    updateDrones(deltaTime) {
        this.drones.forEach(drone => {
            if (drone.hasShield) {
                drone.shieldTimer--;
                if (drone.shieldTimer <= 0) {
                    drone.hasShield = false;
                }
            }
            
            if (drone.targetX !== null && drone.targetY !== null) {
                const dx = drone.targetX - drone.x;
                const dy = drone.targetY - drone.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist > 5) {
                    drone.x += (dx / dist) * drone.speed;
                    drone.y += (dy / dist) * drone.speed;
                } else {
                    drone.targetX = null;
                    drone.targetY = null;
                }
            }
            
            if (drone.attackCooldown > 0) {
                drone.attackCooldown--;
            }
            
            if (drone.attackCooldown <= 0) {
                const target = this.findTarget(drone);
                if (target) {
                    this.droneAttack(drone, target);
                    drone.attackCooldown = 60;
                }
            }
        });
    }
    
    findTarget(drone) {
        let closestTarget = null;
        let closestDist = Infinity;
        
        this.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - drone.x, enemy.y - drone.y);
            if (dist < drone.range && dist < closestDist) {
                closestDist = dist;
                closestTarget = enemy;
            }
        });
        
        if (!closestTarget && drone.type === 'combat') {
            this.crystalNodes.forEach(crystal => {
                if (crystal.health > 0) {
                    const dist = Math.hypot(crystal.x - drone.x, crystal.y - drone.y);
                    if (dist < drone.range && dist < closestDist) {
                        closestDist = dist;
                        closestTarget = crystal;
                    }
                }
            });
        }
        
        return closestTarget;
    }
    
    droneAttack(drone, target) {
        if (drone.type === 'support') {
            const healTarget = this.findHealTarget(drone);
            if (healTarget) {
                healTarget.health = Math.min(healTarget.maxHealth, healTarget.health + 15);
                this.createHealEffect(healTarget.x, healTarget.y);
            }
        } else {
            this.projectiles.push({
                x: drone.x,
                y: drone.y,
                targetX: target.x,
                targetY: target.y,
                target: target,
                damage: drone.damage,
                speed: 8,
                color: this.getDroneProjectileColor(drone.type)
            });
            
            this.createMuzzleFlash(drone.x, drone.y);
        }
    }
    
    findHealTarget(drone) {
        let lowestHealthTarget = null;
        let lowestHealthPercent = Infinity;
        
        this.drones.forEach(otherDrone => {
            if (otherDrone !== drone) {
                const dist = Math.hypot(otherDrone.x - drone.x, otherDrone.y - drone.y);
                const healthPercent = otherDrone.health / otherDrone.maxHealth;
                
                if (dist < drone.range && healthPercent < 0.8 && healthPercent < lowestHealthPercent) {
                    lowestHealthPercent = healthPercent;
                    lowestHealthTarget = otherDrone;
                }
            }
        });
        
        return lowestHealthTarget;
    }
    
    getDroneProjectileColor(type) {
        const colors = {
            'scout': '#4ecdc4',
            'combat': '#ff6b6b',
            'support': '#a8e6cf'
        };
        return colors[type] || '#ffffff';
    }
    
    updateEnemies(deltaTime) {
        this.enemies.forEach(enemy => {
            if (enemy.stunned) {
                enemy.stunTimer--;
                if (enemy.stunTimer <= 0) {
                    enemy.stunned = false;
                }
                return;
            }
            
            if (enemy.attackCooldown > 0) {
                enemy.attackCooldown--;
            }
            
            const target = this.findEnemyTarget(enemy);
            
            if (target) {
                const dx = target.x - enemy.x;
                const dy = target.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist > 50) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                } else if (enemy.attackCooldown <= 0) {
                    this.enemyAttack(enemy, target);
                    enemy.attackCooldown = 90;
                }
            }
        });
    }
    
    findEnemyTarget(enemy) {
        let closestTarget = null;
        let closestDist = Infinity;
        
        this.drones.forEach(drone => {
            const dist = Math.hypot(drone.x - enemy.x, drone.y - enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestTarget = drone;
            }
        });
        
        if (!closestTarget) {
            closestTarget = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2
            };
        }
        
        return closestTarget;
    }
    
    enemyAttack(enemy, target) {
        if (target.hasShield) {
            this.createBlockEffect(target.x, target.y);
            return;
        }
        
        target.health -= enemy.damage;
        this.createDamageEffect(target.x, target.y);
    }
    
    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < proj.speed) {
                if (proj.target) {
                    proj.target.health -= proj.damage;
                    this.createHitEffect(proj.target.x, proj.target.y, proj.color);
                }
                return false;
            }
            
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
            
            return true;
        });
    }
    
    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.life--;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            return particle.life > 0;
        });
    }
    
    checkCollisions() {
        this.drones = this.drones.filter(drone => {
            if (drone.health <= 0) {
                this.createExplosion(drone.x, drone.y, this.getDroneProjectileColor(drone.type));
                this.log(`一架${this.getDroneTypeName(drone.type)}无人机被摧毁！`);
                return false;
            }
            return true;
        });
        
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.health <= 0) {
                this.createExplosion(enemy.x, enemy.y, '#ff4757');
                this.energy += 15;
                this.totalKills++;
                return false;
            }
            return true;
        });
        
        this.crystalNodes = this.crystalNodes.filter(crystal => {
            if (crystal.health <= 0) {
                this.createCrystalExplosion(crystal.x, crystal.y);
                this.crystals += crystal.crystalValue;
                this.totalCrystalsCollected += crystal.crystalValue;
                this.log(`能量晶石已开采！获得 ${crystal.crystalValue} 晶石`);
                return false;
            }
            return true;
        });
    }
    
    checkWaveStatus() {
        if (this.waveInProgress && this.enemies.length === 0) {
            setTimeout(() => {
                if (this.enemies.length === 0 && this.waveInProgress) {
                    this.waveInProgress = false;
                    this.currentWave++;
                    document.getElementById('game-status').textContent = '准备中';
                    
                    const waveBonus = 30 + this.currentWave * 10;
                    this.energy += waveBonus;
                    
                    this.log(`波次 ${this.currentWave - 1} 完成！获得 ${waveBonus} 能量奖励。`);
                    this.log(`准备迎接波次 ${this.currentWave}...`);
                }
            }, 2000);
        }
    }
    
    createPlacementEffect(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                life: 30,
                maxLife: 30,
                color: '#00ffff',
                size: 3
            });
        }
    }
    
    createMuzzleFlash(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 10,
                maxLife: 10,
                color: '#ffff00',
                size: 2
            });
        }
    }
    
    createHitEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 15,
                maxLife: 15,
                color: color,
                size: 2
            });
        }
    }
    
    createDamageEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 20,
                maxLife: 20,
                color: '#ff4757',
                size: 3
            });
        }
    }
    
    createHealEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 1,
                vy: -1 - Math.random(),
                life: 30,
                maxLife: 30,
                color: '#a8e6cf',
                size: 2
            });
        }
    }
    
    createBlockEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            this.particles.push({
                x: x + Math.cos(angle) * 20,
                y: y + Math.sin(angle) * 20,
                vx: Math.cos(angle) * 1,
                vy: Math.sin(angle) * 1,
                life: 20,
                maxLife: 20,
                color: '#70a1ff',
                size: 3
            });
        }
    }
    
    createExplosion(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40,
                maxLife: 40,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }
    
    createCrystalExplosion(x, y) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 50,
                maxLife: 50,
                color: '#ffd700',
                size: 2 + Math.random() * 4
            });
        }
    }
    
    createLaserEffect(x, y) {
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 150;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 60,
                maxLife: 60,
                color: i % 2 === 0 ? '#ff4757' : '#ff3838',
                size: 2 + Math.random() * 3
            });
        }
    }
    
    createEMPEffect(x, y) {
        for (let ring = 0; ring < 5; ring++) {
            setTimeout(() => {
                for (let i = 0; i < 30; i++) {
                    const angle = (i / 30) * Math.PI * 2;
                    const dist = (ring + 1) * 40;
                    this.particles.push({
                        x: x + Math.cos(angle) * dist,
                        y: y + Math.sin(angle) * dist,
                        vx: Math.cos(angle) * 0.5,
                        vy: Math.sin(angle) * 0.5,
                        life: 30,
                        maxLife: 30,
                        color: '#5352ed',
                        size: 3
                    });
                }
            }, ring * 100);
        }
    }
    
    createShieldEffect() {
        this.drones.forEach(drone => {
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                this.particles.push({
                    x: drone.x + Math.cos(angle) * 25,
                    y: drone.y + Math.sin(angle) * 25,
                    vx: Math.cos(angle) * 0.5,
                    vy: Math.sin(angle) * 0.5,
                    life: 40,
                    maxLife: 40,
                    color: '#70a1ff',
                    size: 3
                });
            }
        });
    }
    
    createWaveEffect() {
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 60,
                maxLife: 60,
                color: '#ff6b6b',
                size: 1 + Math.random() * 2
            });
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        this.drawGrid();
        this.drawCrystalNodes();
        this.drawDrones();
        this.drawEnemies();
        this.drawProjectiles();
        this.drawParticles();
        this.drawSkillIndicator();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let col = 0; col <= this.gridCols; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.gridSize, 0);
            this.ctx.lineTo(col * this.gridSize, this.gridRows * this.gridSize);
            this.ctx.stroke();
        }
        
        for (let row = 0; row <= this.gridRows; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.gridSize);
            this.ctx.lineTo(this.gridCols * this.gridSize, row * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawCrystalNodes() {
        this.crystalNodes.forEach(crystal => {
            this.ctx.save();
            this.ctx.translate(crystal.x, crystal.y);
            this.ctx.rotate(Date.now() / 1000);
            
            const gradient = this.ctx.createRadialGradient(0, 0, 5, 0, 0, 20);
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(0.5, '#ffa500');
            gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * 15;
                const y = Math.sin(angle) * 15;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
            
            const healthPercent = crystal.health / crystal.maxHealth;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(crystal.x - 15, crystal.y - 30, 30, 4);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#ffd700' : '#ff4757';
            this.ctx.fillRect(crystal.x - 15, crystal.y - 30, 30 * healthPercent, 4);
        });
    }
    
    drawDrones() {
        this.drones.forEach(drone => {
            const colors = {
                'scout': { main: '#4ecdc4', glow: 'rgba(78, 205, 196, 0.3)' },
                'combat': { main: '#ff6b6b', glow: 'rgba(255, 107, 107, 0.3)' },
                'support': { main: '#a8e6cf', glow: 'rgba(168, 230, 207, 0.3)' }
            };
            
            const droneColors = colors[drone.type];
            
            if (drone.hasShield) {
                this.ctx.strokeStyle = 'rgba(112, 161, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(drone.x, drone.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            const gradient = this.ctx.createRadialGradient(drone.x, drone.y, 5, drone.x, drone.y, 20);
            gradient.addColorStop(0, droneColors.glow);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(drone.x, drone.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = droneColors.main;
            this.ctx.beginPath();
            
            if (drone.type === 'scout') {
                this.ctx.moveTo(drone.x, drone.y - 12);
                this.ctx.lineTo(drone.x - 10, drone.y + 8);
                this.ctx.lineTo(drone.x + 10, drone.y + 8);
            } else if (drone.type === 'combat') {
                this.ctx.arc(drone.x, drone.y, 10, 0, Math.PI * 2);
            } else {
                this.ctx.rect(drone.x - 8, drone.y - 8, 16, 16);
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(drone.x, drone.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            const healthPercent = drone.health / drone.maxHealth;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(drone.x - 12, drone.y - 20, 24, 3);
            this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff80' : (healthPercent > 0.25 ? '#ffa500' : '#ff4757');
            this.ctx.fillRect(drone.x - 12, drone.y - 20, 24 * healthPercent, 3);
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            const colors = {
                'basic': { main: '#ff4757', glow: 'rgba(255, 71, 87, 0.3)' },
                'heavy': { main: '#ff3838', glow: 'rgba(255, 56, 56, 0.4)' }
            };
            
            const enemyColors = colors[enemy.type];
            const size = enemy.type === 'heavy' ? 18 : 12;
            
            if (enemy.stunned) {
                this.ctx.strokeStyle = 'rgba(83, 82, 237, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, size + 8, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            const gradient = this.ctx.createRadialGradient(enemy.x, enemy.y, 5, enemy.x, enemy.y, size + 8);
            gradient.addColorStop(0, enemyColors.glow);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, size + 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = enemyColors.main;
            this.ctx.beginPath();
            
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                const x = enemy.x + Math.cos(angle) * size;
                const y = enemy.y + Math.sin(angle) * size;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            const healthPercent = enemy.health / enemy.maxHealth;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(enemy.x - 15, enemy.y - size - 10, 30, 3);
            this.ctx.fillStyle = '#ff4757';
            this.ctx.fillRect(enemy.x - 15, enemy.y - size - 10, 30 * healthPercent, 3);
        });
    }
    
    drawProjectiles() {
        this.projectiles.forEach(proj => {
            const gradient = this.ctx.createRadialGradient(proj.x, proj.y, 1, proj.x, proj.y, 5);
            gradient.addColorStop(0, proj.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            
            this.particleCtx.globalAlpha = alpha;
            this.particleCtx.fillStyle = particle.color;
            this.particleCtx.beginPath();
            this.particleCtx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            this.particleCtx.fill();
        });
        
        this.particleCtx.globalAlpha = 1;
    }
    
    drawSkillIndicator() {
        if (this.selectedSkill) {
            this.ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`点击战场释放: ${this.getSkillName(this.selectedSkill)}`, 
                this.canvas.width / 2, 30);
        }
    }
    
    executeProgram(program) {
        if (!program || program.trim() === '') {
            this.log('请输入指令');
            return;
        }
        
        const lines = program.toLowerCase().split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            const parts = line.split(/\s+/);
            const command = parts[0];
            
            switch (command) {
                case 'move':
                    if (parts.length >= 3) {
                        const x = parseInt(parts[1]) * this.gridSize + this.gridSize / 2;
                        const y = parseInt(parts[2]) * this.gridSize + this.gridSize / 2;
                        this.drones.forEach(drone => {
                            drone.targetX = x + (Math.random() - 0.5) * 50;
                            drone.targetY = y + (Math.random() - 0.5) * 50;
                        });
                        this.log(`集群移动至 (${parts[1]}, ${parts[2]})`);
                    }
                    break;
                    
                case 'attack':
                    this.log('集群进入攻击模式');
                    break;
                    
                case 'formation':
                    if (parts.length >= 2) {
                        const formation = parts[1];
                        if (['spread', 'line', 'circle', 'phalanx'].includes(formation)) {
                            this.selectedFormation = formation;
                            document.querySelectorAll('.formation-btn').forEach(b => b.classList.remove('active'));
                            document.querySelector(`.formation-btn[data-formation="${formation}"]`)?.classList.add('active');
                            this.applyFormation();
                            this.log(`编队切换为: ${this.getFormationName(formation)}`);
                        }
                    }
                    break;
                    
                case 'scout':
                    this.drones.filter(d => d.type === 'scout').forEach(drone => {
                        drone.targetX = Math.random() * this.canvas.width;
                        drone.targetY = Math.random() * this.canvas.height;
                    });
                    this.log('侦察型无人机开始巡逻');
                    break;
                    
                default:
                    this.log(`未知指令: ${command}`);
            }
        });
    }
    
    updateUI() {
        document.getElementById('energy').textContent = Math.floor(this.energy);
        document.getElementById('crystals').textContent = this.crystals;
        document.getElementById('wave').textContent = this.currentWave;
    }
    
    updateSkillUI() {
        for (let skill in this.skillCooldowns) {
            const skillElement = document.getElementById(`skill-${skill.replace('-', '')}`);
            if (skillElement) {
                const cooldownElement = skillElement.querySelector('.skill-cooldown');
                
                if (this.skillCooldowns[skill] > 0) {
                    skillElement.classList.add('on-cooldown');
                    cooldownElement.textContent = `${Math.ceil(this.skillCooldowns[skill])}s`;
                } else {
                    skillElement.classList.remove('on-cooldown');
                    cooldownElement.textContent = '就绪';
                }
            }
        }
    }
    
    log(message) {
        const logElement = document.getElementById('game-log');
        logElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        console.log(message);
    }
    
    gameOver(victory) {
        this.gameState = 'gameover';
        
        const gameOverPanel = document.getElementById('game-over-panel');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        if (victory) {
            title.textContent = '胜利！';
            message.textContent = '你成功保护了能量晶石矿脉！';
        } else {
            title.textContent = '游戏结束';
            message.textContent = '基地被摧毁了...';
        }
        
        document.getElementById('final-wave').textContent = this.currentWave;
        document.getElementById('final-kills').textContent = this.totalKills;
        document.getElementById('final-crystals').textContent = this.totalCrystalsCollected;
        
        gameOverPanel.classList.remove('hidden');
    }
}

let game;
let lastTime = 0;
let gameSpeed = 1;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) * gameSpeed;
    lastTime = timestamp;
    
    game.update(deltaTime);
    game.render();
    
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    requestAnimationFrame(gameLoop);
});
