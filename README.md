# jmaker-server

## requirements:

- FreeBSD >= 11.1
- redis
- node >= 9.1
- `npm` or `yarn`
- [check_ip](https://github.com/jail-maker/check_ip) -
for automatically getting ip addresses

tune in /boot/loader.conf:
```
kern.racct.enable=1
ng_ether_load="YES"
```

tune in /etc/rc.conf:
```
redis_enable="YES"
```

## recommendations:
tune in /etc/rc.conf:
```
sendmail_enable="NO"
rpcbind_enable="NO"
```
## install:
1. clone and change directory project
2. install dependencies `$ yarn`
3. run `$ sudo ./index.js --config=config.yml`
